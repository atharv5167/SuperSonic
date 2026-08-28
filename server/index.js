const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure uploads directory exists for local MP3 storage fallback
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// In-Memory High-Performance Room Store
// Structured for ultra-low latency lookups (< 1ms in-memory access)
const rooms = new Map();

// Helper to calculate exact current playback position
function getExactPlaybackPosition(playbackState) {
  if (!playbackState.isPlaying) {
    return playbackState.position;
  }
  const elapsedSeconds = (Date.now() - playbackState.startedAt) / 1000;
  return Math.max(0, playbackState.position + elapsedSeconds);
}

// Helper to create a new room state object
function createRoomState(roomId, hostId, hostName, roomName = 'SuperSonic Party') {
  return {
    id: roomId,
    name: roomName,
    hostId: hostId,
    hostSocketId: null,
    status: 'active', // 'active' | 'ended'
    createdAt: Date.now(),
    endedAt: null,
    tracks: [],
    currentTrackIndex: 0,
    playbackState: {
      isPlaying: false,
      position: 0, // In seconds
      startedAt: Date.now(),
      playbackRate: 1.0,
      lastUpdated: Date.now()
    },
    participants: new Map(), // socketId -> { userId, username, avatar, isHost, joinedAt }
    chatMessages: [],
    tracksPlayedHistory: new Set(),
    peakParticipants: 0,
    isMutedParticipants: new Set()
  };
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

// REST API Endpoints for Diagnostics & Direct Actions
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeRooms: rooms.size,
    timestamp: Date.now(),
    serverTimeISO: new Date().toISOString()
  });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const currentPos = getExactPlaybackPosition(room.playbackState);
  res.json({
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    status: room.status,
    tracksCount: room.tracks.length,
    currentTrack: room.tracks[room.currentTrackIndex] || null,
    currentTrackIndex: room.currentTrackIndex,
    isPlaying: room.playbackState.isPlaying,
    currentPosition: currentPos,
    participantCount: room.participants.size,
    serverTimestamp: Date.now()
  });
});

// Periodic Authority Broadcast (Every 3 seconds)
// Keeps all connected clients tightly aligned and handles any network jitter
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (room.status === 'active' && room.participants.size > 0) {
      const currentPosition = getExactPlaybackPosition(room.playbackState);
      
      io.to(roomId).emit('sync:heartbeat', {
        serverTimestamp: now,
        isPlaying: room.playbackState.isPlaying,
        currentPosition: currentPosition,
        currentTrackIndex: room.currentTrackIndex,
        playbackRate: room.playbackState.playbackRate || 1.0
      });
    }
  }
}, 3000);

// Socket.IO Real-Time Connection Handling
io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUser = null;

  // 1. High-Precision NTP-like Time Synchronization
  // Allows clients to calculate round-trip delay and clock offset down to < 5ms
  socket.on('sync:ping', (data) => {
    const serverReceiveTime = Date.now();
    socket.emit('sync:pong', {
      clientSendTime: data.clientSendTime,
      serverReceiveTime: serverReceiveTime,
      serverTransmitTime: Date.now()
    });
  });

  // 2. Room Initialization / Registration (Host or Participant)
  socket.on('room:init', ({ roomId, hostId, hostName, roomName, initialTracks = [] }, callback) => {
    let room = rooms.get(roomId);
    if (!room) {
      room = createRoomState(roomId, hostId, hostName, roomName);
      if (Array.isArray(initialTracks) && initialTracks.length > 0) {
        room.tracks = [...initialTracks];
      }
      rooms.set(roomId, room);
      console.log(`[Room Created] ID: ${roomId}, Host: ${hostName} (${hostId})`);
    } else if (room.status === 'ended') {
      // Re-activate if host is re-entering
      room.status = 'active';
    }

    if (callback) callback({ success: true, room: sanitizeRoomState(room) });
  });

  // 3. Join Room
  socket.on('room:join', ({ roomId, userId, username, avatar, isHost }, callback) => {
    let room = rooms.get(roomId);

    // If room doesn't exist yet and user is host, create it automatically
    if (!room) {
      if (isHost) {
        room = createRoomState(roomId, userId, username);
        rooms.set(roomId, room);
      } else {
        if (callback) callback({ success: false, error: 'Room not found or party has ended.' });
        return;
      }
    }

    if (room.status === 'ended') {
      if (callback) callback({ success: false, error: 'This party room has ended.' });
      return;
    }

    currentRoomId = roomId;
    currentUser = {
      socketId: socket.id,
      userId: userId || `guest_${socket.id.substring(0, 5)}`,
      username: username || 'Guest Jammer',
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${socket.id}`,
      isHost: isHost || room.hostId === userId,
      joinedAt: Date.now()
    };

    socket.join(roomId);
    room.participants.set(socket.id, currentUser);
    room.peakParticipants = Math.max(room.peakParticipants, room.participants.size);

    if (currentUser.isHost) {
      room.hostSocketId = socket.id;
    }

    console.log(`[User Joined] ${currentUser.username} (${socket.id}) -> Room ${roomId}`);

    // Compute exact playback state for the joining user
    const exactPos = getExactPlaybackPosition(room.playbackState);
    const roomPayload = {
      ...sanitizeRoomState(room),
      playbackState: {
        ...room.playbackState,
        position: exactPos,
        serverTimestamp: Date.now()
      },
      participants: Array.from(room.participants.values())
    };

    if (callback) {
      callback({
        success: true,
        room: roomPayload,
        currentUser: currentUser,
        serverTimestamp: Date.now()
      });
    }

    // Broadcast updated participant list to room
    io.to(roomId).emit('room:participants_updated', {
      participants: Array.from(room.participants.values()),
      count: room.participants.size
    });

    // Notify room of new joiner
    socket.to(roomId).emit('chat:system_message', {
      id: `sys_${Date.now()}`,
      content: `${currentUser.username} joined the party! 🎵`,
      timestamp: Date.now()
    });
  });

  // 4. Host Playback Control: PLAY
  socket.on('playback:play', ({ roomId, trackIndex, position, clientTimestamp }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'active') return;

    const participant = room.participants.get(socket.id);
    if (!participant || (!participant.isHost && room.hostId !== participant.userId)) {
      socket.emit('error:unauthorized', { message: 'Only the host can control playback.' });
      return;
    }

    const now = Date.now();
    const targetTrackIndex = (typeof trackIndex === 'number' && trackIndex >= 0) ? trackIndex : room.currentTrackIndex;
    const targetPosition = typeof position === 'number' ? Math.max(0, position) : room.playbackState.position;

    room.currentTrackIndex = targetTrackIndex;
    room.playbackState = {
      isPlaying: true,
      position: targetPosition,
      startedAt: now,
      playbackRate: 1.0,
      lastUpdated: now
    };

    if (room.tracks[targetTrackIndex]) {
      room.tracksPlayedHistory.add(room.tracks[targetTrackIndex].title || `Track #${targetTrackIndex + 1}`);
    }

    console.log(`[Playback PLAY] Room: ${roomId}, Track: ${targetTrackIndex}, Pos: ${targetPosition.toFixed(2)}s`);

    // Broadcast instant sync play command with authoritative server timestamp
    io.to(roomId).emit('playback:state_changed', {
      action: 'play',
      isPlaying: true,
      currentTrackIndex: room.currentTrackIndex,
      currentTrack: room.tracks[room.currentTrackIndex] || null,
      position: targetPosition,
      serverTimestamp: now,
      triggeredBy: participant.username
    });
  });

  // 5. Host Playback Control: PAUSE
  socket.on('playback:pause', ({ roomId, position }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'active') return;

    const participant = room.participants.get(socket.id);
    if (!participant || (!participant.isHost && room.hostId !== participant.userId)) {
      socket.emit('error:unauthorized', { message: 'Only the host can control playback.' });
      return;
    }

    const now = Date.now();
    const pausedPosition = typeof position === 'number' ? position : getExactPlaybackPosition(room.playbackState);

    room.playbackState = {
      isPlaying: false,
      position: pausedPosition,
      startedAt: now,
      playbackRate: 1.0,
      lastUpdated: now
    };

    console.log(`[Playback PAUSE] Room: ${roomId}, Pos: ${pausedPosition.toFixed(2)}s`);

    io.to(roomId).emit('playback:state_changed', {
      action: 'pause',
      isPlaying: false,
      currentTrackIndex: room.currentTrackIndex,
      currentTrack: room.tracks[room.currentTrackIndex] || null,
      position: pausedPosition,
      serverTimestamp: now,
      triggeredBy: participant.username
    });
  });

  // 6. Host Playback Control: SEEK
  socket.on('playback:seek', ({ roomId, position }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'active') return;

    const participant = room.participants.get(socket.id);
    if (!participant || (!participant.isHost && room.hostId !== participant.userId)) {
      socket.emit('error:unauthorized', { message: 'Only the host can seek audio.' });
      return;
    }

    const now = Date.now();
    const seekPos = Math.max(0, position);

    room.playbackState = {
      ...room.playbackState,
      position: seekPos,
      startedAt: now,
      lastUpdated: now
    };

    console.log(`[Playback SEEK] Room: ${roomId}, Pos: ${seekPos.toFixed(2)}s, isPlaying: ${room.playbackState.isPlaying}`);

    io.to(roomId).emit('playback:seeked', {
      position: seekPos,
      isPlaying: room.playbackState.isPlaying,
      serverTimestamp: now,
      currentTrackIndex: room.currentTrackIndex
    });
  });

  // 7. Host Playback Control: CHANGE TRACK
  socket.on('playback:change_track', ({ roomId, trackIndex, autoPlay = true }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'active') return;

    const participant = room.participants.get(socket.id);
    if (!participant || (!participant.isHost && room.hostId !== participant.userId)) {
      socket.emit('error:unauthorized', { message: 'Only the host can change songs.' });
      return;
    }

    if (trackIndex < 0 || trackIndex >= room.tracks.length) return;

    const now = Date.now();
    room.currentTrackIndex = trackIndex;
    room.playbackState = {
      isPlaying: autoPlay,
      position: 0,
      startedAt: now,
      playbackRate: 1.0,
      lastUpdated: now
    };

    if (room.tracks[trackIndex]) {
      room.tracksPlayedHistory.add(room.tracks[trackIndex].title || `Track #${trackIndex + 1}`);
    }

    console.log(`[Track Changed] Room: ${roomId}, Track Index: ${trackIndex} - "${room.tracks[trackIndex]?.title}"`);

    io.to(roomId).emit('playback:track_changed', {
      currentTrackIndex: trackIndex,
      currentTrack: room.tracks[trackIndex],
      isPlaying: autoPlay,
      position: 0,
      serverTimestamp: now
    });
  });

  // 8. Host Playlist Updates (Add, Remove, Reorder)
  socket.on('playlist:update', ({ roomId, tracks, newCurrentIndex }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'active') return;

    const participant = room.participants.get(socket.id);
    if (!participant || (!participant.isHost && room.hostId !== participant.userId)) {
      socket.emit('error:unauthorized', { message: 'Only the host can modify the playlist.' });
      return;
    }

    room.tracks = Array.isArray(tracks) ? tracks : [];
    if (typeof newCurrentIndex === 'number') {
      room.currentTrackIndex = Math.min(Math.max(0, newCurrentIndex), Math.max(0, room.tracks.length - 1));
    }

    console.log(`[Playlist Updated] Room: ${roomId}, Total Tracks: ${room.tracks.length}`);

    // Send updated playlist to all participants (or track summary if hiding upcoming)
    io.to(roomId).emit('playlist:updated', {
      tracks: room.tracks,
      currentTrackIndex: room.currentTrackIndex,
      currentTrack: room.tracks[room.currentTrackIndex] || null
    });
  });

  // 9. Real-Time Chat & System Messaging
  socket.on('chat:send', ({ roomId, content }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'active') return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    if (room.isMutedParticipants.has(participant.userId)) {
      socket.emit('chat:error', { message: 'You are currently muted by the host.' });
      return;
    }

    if (!content || !content.trim()) return;

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: participant.userId,
      username: participant.username,
      avatar: participant.avatar,
      isHost: participant.isHost,
      content: content.trim().substring(0, 500),
      timestamp: Date.now()
    };

    // Store in temporary session buffer (limited to last 100)
    room.chatMessages.push(message);
    if (room.chatMessages.length > 100) {
      room.chatMessages.shift();
    }

    io.to(roomId).emit('chat:new_message', message);
  });

  // 10. Host Moderation: Warn User
  socket.on('moderation:warn_user', ({ roomId, targetUserId, reason }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant || !participant.isHost) return;

    for (const [sId, p] of room.participants.entries()) {
      if (p.userId === targetUserId) {
        io.to(sId).emit('moderation:warning', {
          reason: reason || 'Please follow room guidelines and keep chat respectful.',
          from: 'Host',
          timestamp: Date.now()
        });
        break;
      }
    }
  });

  // 11. Host Moderation: Kick User
  socket.on('moderation:kick_user', ({ roomId, targetUserId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant || !participant.isHost) return;

    for (const [sId, p] of room.participants.entries()) {
      if (p.userId === targetUserId && !p.isHost) {
        io.to(sId).emit('moderation:kicked', {
          message: 'You have been removed from the party by the host.'
        });
        io.sockets.sockets.get(sId)?.leave(roomId);
        room.participants.delete(sId);
        break;
      }
    }

    io.to(roomId).emit('room:participants_updated', {
      participants: Array.from(room.participants.values()),
      count: room.participants.size
    });
  });

  // 12. Host Moderation: Mute/Unmute User
  socket.on('moderation:toggle_mute', ({ roomId, targetUserId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant || !participant.isHost) return;

    if (room.isMutedParticipants.has(targetUserId)) {
      room.isMutedParticipants.delete(targetUserId);
    } else {
      room.isMutedParticipants.add(targetUserId);
    }

    io.to(roomId).emit('moderation:mute_status', {
      userId: targetUserId,
      isMuted: room.isMutedParticipants.has(targetUserId)
    });
  });

  // 13. End Party & Clean Up
  socket.on('room:end_party', ({ roomId }, callback) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant || (!participant.isHost && room.hostId !== participant.userId)) {
      if (callback) callback({ success: false, error: 'Only the host can end the party.' });
      return;
    }

    const durationSeconds = Math.floor((Date.now() - room.createdAt) / 1000);
    const summary = {
      roomId: room.id,
      hostId: room.hostId,
      name: room.name,
      startedAt: room.createdAt,
      endedAt: Date.now(),
      durationSeconds: durationSeconds,
      peakParticipants: room.peakParticipants,
      totalParticipants: room.peakParticipants,
      tracksPlayed: Array.from(room.tracksPlayedHistory)
    };

    room.status = 'ended';
    room.endedAt = Date.now();
    room.playbackState.isPlaying = false;

    console.log(`[Party Ended] Room: ${roomId}, Duration: ${durationSeconds}s, Peak: ${room.peakParticipants}`);

    // Notify all participants that party has ended and provide lightweight summary
    io.to(roomId).emit('room:ended', {
      summary: summary,
      message: 'The host has concluded this party. Thank you for jamming!'
    });

    if (callback) callback({ success: true, summary });

    // Clean up temporary active session data after a short grace period (5 mins)
    setTimeout(() => {
      if (rooms.get(roomId)?.status === 'ended') {
        rooms.delete(roomId);
        console.log(`[Room Cleaned] Temporary memory wiped for room ${roomId}`);
      }
    }, 5 * 60 * 1000);
  });

  // 14. Disconnection Handling
  socket.on('disconnect', () => {
    if (currentRoomId && rooms.has(currentRoomId)) {
      const room = rooms.get(currentRoomId);
      const user = room.participants.get(socket.id);

      if (user) {
        room.participants.delete(socket.id);
        console.log(`[User Left] ${user.username} disconnected from room ${currentRoomId}`);

        io.to(currentRoomId).emit('room:participants_updated', {
          participants: Array.from(room.participants.values()),
          count: room.participants.size
        });

        // If host disconnected, give a notification
        if (user.isHost) {
          io.to(currentRoomId).emit('chat:system_message', {
            id: `sys_${Date.now()}`,
            content: `Host ${user.username} disconnected temporarily.`,
            timestamp: Date.now()
          });
        }
      }
    }
  });
});

// Helper to sanitize room state for safe transport
function sanitizeRoomState(room) {
  return {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    status: room.status,
    createdAt: room.createdAt,
    tracks: room.tracks,
    currentTrackIndex: room.currentTrackIndex,
    currentTrack: room.tracks[room.currentTrackIndex] || null,
    playbackState: { ...room.playbackState },
    chatMessages: room.chatMessages.slice(-50)
  };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`⚡ SuperSonic Real-Time Sync Server running on port ${PORT}`);
  console.log(`🕒 Sub-100ms NTP Drift Compensation Engine Active`);
  console.log(`📡 WebSocket Transports: WebSocket, Polling`);
  console.log(`====================================================`);
});
