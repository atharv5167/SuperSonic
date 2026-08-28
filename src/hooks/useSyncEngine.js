'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSyncEngine({ roomId, userId, username, avatar, isHost }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [clockOffset, setClockOffset] = useState(0); // Offset in milliseconds between client & server
  const [rtt, setRtt] = useState(0); // Round-trip time
  
  // Room State
  const [roomState, setRoomState] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [partySummary, setPartySummary] = useState(null);
  const [isPartyEnded, setIsPartyEnded] = useState(false);
  const [moderationAlert, setModerationAlert] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  // Playback Timing References for sub-100ms math
  const playbackRef = useRef({
    isPlaying: false,
    basePosition: 0,
    startedAt: Date.now(),
    lastUpdated: Date.now()
  });

  const clockOffsetRef = useRef(0);
  clockOffsetRef.current = clockOffset;

  // 1. High-Precision NTP Clock Calibration (Calculates median clock offset)
  const calibrateClock = useCallback((socketInstance) => {
    if (!socketInstance || !socketInstance.connected) return;

    const samples = [];
    const sampleCount = 5;
    let completed = 0;

    for (let i = 0; i < sampleCount; i++) {
      setTimeout(() => {
        const clientSendTime = Date.now();
        socketInstance.emit('sync:ping', { clientSendTime });
      }, i * 150);
    }

    const onPong = (data) => {
      const clientReceiveTime = Date.now();
      const rttSample = clientReceiveTime - data.clientSendTime;
      const oneWayDelay = rttSample / 2;
      const offsetSample = (data.serverReceiveTime - data.clientSendTime + (data.serverTransmitTime - clientReceiveTime)) / 2;

      samples.push({ offset: offsetSample, rtt: rttSample });
      completed++;

      if (completed >= sampleCount) {
        socketInstance.off('sync:pong', onPong);
        // Sort to get median sample (removes network outliers)
        samples.sort((a, b) => a.rtt - b.rtt);
        const bestSample = samples[0];
        setClockOffset(bestSample.offset);
        setRtt(bestSample.rtt);
        console.log(`[Clock Calibrated] Offset: ${bestSample.offset.toFixed(2)}ms, RTT: ${bestSample.rtt.toFixed(2)}ms`);
      }
    };

    socketInstance.on('sync:pong', onPong);
  }, []);

  // 2. Initialize Socket Connection & Event Listeners
  useEffect(() => {
    if (!roomId) return;

    const socketInstance = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      console.log(`[Socket Connected] ID: ${socketInstance.id}`);
      setIsConnected(true);
      
      // Calibrate clock
      calibrateClock(socketInstance);

      // Join the room
      socketInstance.emit('room:join', {
        roomId,
        userId,
        username,
        avatar,
        isHost
      }, (response) => {
        if (response?.success) {
          const room = response.room;
          setRoomState(room);
          setCurrentTrack(room.currentTrack);
          setCurrentTrackIndex(room.currentTrackIndex || 0);
          setIsPlaying(Boolean(room.playbackState?.isPlaying));
          setParticipants(room.participants || []);
          setChatMessages(room.chatMessages || []);

          playbackRef.current = {
            isPlaying: Boolean(room.playbackState?.isPlaying),
            basePosition: room.playbackState?.position || 0,
            startedAt: room.playbackState?.startedAt || Date.now(),
            lastUpdated: Date.now()
          };
        } else if (response?.error) {
          console.warn('Join room error:', response.error);
        }
      });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle Playback State Changes (Play / Pause)
    socketInstance.on('playback:state_changed', (data) => {
      console.log('[Sync Event] Playback state changed:', data);
      setIsPlaying(data.isPlaying);
      setCurrentTrackIndex(data.currentTrackIndex);
      if (data.currentTrack) setCurrentTrack(data.currentTrack);

      playbackRef.current = {
        isPlaying: data.isPlaying,
        basePosition: data.position,
        startedAt: data.serverTimestamp,
        lastUpdated: Date.now()
      };
    });

    // Handle Track Seek
    socketInstance.on('playback:seeked', (data) => {
      console.log('[Sync Event] Seeked to:', data.position);
      playbackRef.current = {
        isPlaying: data.isPlaying,
        basePosition: data.position,
        startedAt: data.serverTimestamp,
        lastUpdated: Date.now()
      };
    });

    // Handle Track Changed
    socketInstance.on('playback:track_changed', (data) => {
      console.log('[Sync Event] Track changed to:', data.currentTrack?.title);
      setCurrentTrackIndex(data.currentTrackIndex);
      setCurrentTrack(data.currentTrack);
      setIsPlaying(data.isPlaying);

      playbackRef.current = {
        isPlaying: data.isPlaying,
        basePosition: 0,
        startedAt: data.serverTimestamp,
        lastUpdated: Date.now()
      };
    });

    // Handle Heartbeat Drift Correction (Every 3s)
    socketInstance.on('sync:heartbeat', (data) => {
      if (data.isPlaying !== undefined) {
        setIsPlaying(data.isPlaying);
      }
      if (data.currentTrackIndex !== undefined && data.currentTrackIndex !== currentTrackIndex) {
        setCurrentTrackIndex(data.currentTrackIndex);
      }
      
      // Update reference position
      playbackRef.current.basePosition = data.currentPosition;
      playbackRef.current.startedAt = data.serverTimestamp;
      playbackRef.current.isPlaying = data.isPlaying;
    });

    // Handle Playlist Updates
    socketInstance.on('playlist:updated', (data) => {
      if (data.tracks) {
        setRoomState(prev => prev ? { ...prev, tracks: data.tracks } : prev);
      }
      if (data.currentTrack) setCurrentTrack(data.currentTrack);
      if (typeof data.currentTrackIndex === 'number') setCurrentTrackIndex(data.currentTrackIndex);
    });

    // Handle Participants List Update
    socketInstance.on('room:participants_updated', (data) => {
      setParticipants(data.participants || []);
    });

    // Handle Chat Messages
    socketInstance.on('chat:new_message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socketInstance.on('chat:system_message', (msg) => {
      setChatMessages(prev => [...prev, { ...msg, isSystem: true }]);
    });

    // Handle Moderation Events
    socketInstance.on('moderation:warning', (data) => {
      setModerationAlert(data);
    });

    socketInstance.on('moderation:kicked', (data) => {
      alert(data.message || 'You have been kicked from the party.');
      window.location.href = '/dashboard';
    });

    socketInstance.on('moderation:mute_status', (data) => {
      if (data.userId === userId) {
        setIsMuted(data.isMuted);
      }
    });

    // Handle Party End
    socketInstance.on('room:ended', (data) => {
      setIsPartyEnded(true);
      setIsPlaying(false);
      setPartySummary(data.summary);
    });

    setSocket(socketInstance);

    // Periodic Re-calibration every 60s
    const recalibrateInterval = setInterval(() => {
      calibrateClock(socketInstance);
    }, 60000);

    return () => {
      clearInterval(recalibrateInterval);
      socketInstance.disconnect();
    };
  }, [roomId, userId, username, avatar, isHost, calibrateClock]);

  // Method to get computed current playback position down to millisecond
  const getSynchronizedTime = useCallback(() => {
    const { isPlaying: activePlaying, basePosition, startedAt } = playbackRef.current;
    if (!activePlaying) return basePosition;

    const currentServerTime = Date.now() + clockOffsetRef.current;
    const elapsedSeconds = Math.max(0, (currentServerTime - startedAt) / 1000);
    return basePosition + elapsedSeconds;
  }, []);

  // Host Action: Play
  const play = useCallback((position) => {
    if (!socket || !isHost) return;
    const pos = typeof position === 'number' ? position : getSynchronizedTime();
    socket.emit('playback:play', {
      roomId,
      trackIndex: currentTrackIndex,
      position: pos,
      clientTimestamp: Date.now()
    });
  }, [socket, isHost, roomId, currentTrackIndex, getSynchronizedTime]);

  // Host Action: Pause
  const pause = useCallback((position) => {
    if (!socket || !isHost) return;
    const pos = typeof position === 'number' ? position : getSynchronizedTime();
    socket.emit('playback:pause', {
      roomId,
      position: pos
    });
  }, [socket, isHost, roomId, getSynchronizedTime]);

  // Host Action: Seek
  const seek = useCallback((position) => {
    if (!socket || !isHost) return;
    socket.emit('playback:seek', {
      roomId,
      position: Math.max(0, position)
    });
  }, [socket, isHost, roomId]);

  // Host Action: Change Track
  const changeTrack = useCallback((index) => {
    if (!socket || !isHost) return;
    socket.emit('playback:change_track', {
      roomId,
      trackIndex: index,
      autoPlay: true
    });
  }, [socket, isHost, roomId]);

  // Host Action: Update Playlist
  const updatePlaylist = useCallback((newTracks, newIndex) => {
    if (!socket || !isHost) return;
    socket.emit('playlist:update', {
      roomId,
      tracks: newTracks,
      newCurrentIndex: newIndex
    });
  }, [socket, isHost, roomId]);

  // Action: Send Chat
  const sendChatMessage = useCallback((content) => {
    if (!socket || !content?.trim()) return;
    socket.emit('chat:send', {
      roomId,
      content: content.trim()
    });
  }, [socket, roomId]);

  // Host Moderation Actions
  const warnUser = useCallback((targetUserId, reason) => {
    if (!socket || !isHost) return;
    socket.emit('moderation:warn_user', { roomId, targetUserId, reason });
  }, [socket, isHost, roomId]);

  const kickUser = useCallback((targetUserId) => {
    if (!socket || !isHost) return;
    socket.emit('moderation:kick_user', { roomId, targetUserId });
  }, [socket, isHost, roomId]);

  const toggleMuteUser = useCallback((targetUserId) => {
    if (!socket || !isHost) return;
    socket.emit('moderation:toggle_mute', { roomId, targetUserId });
  }, [socket, isHost, roomId]);

  // Host Action: End Party
  const endParty = useCallback(() => {
    if (!socket || !isHost) return;
    socket.emit('room:end_party', { roomId }, (response) => {
      if (response?.success) {
        setIsPartyEnded(true);
        setPartySummary(response.summary);
      }
    });
  }, [socket, isHost, roomId]);

  return {
    socket,
    isConnected,
    clockOffset,
    rtt,
    roomState,
    currentTrack,
    currentTrackIndex,
    isPlaying,
    participants,
    chatMessages,
    partySummary,
    isPartyEnded,
    moderationAlert,
    isMuted,
    clearModerationAlert: () => setModerationAlert(null),
    getSynchronizedTime,
    play,
    pause,
    seek,
    changeTrack,
    updatePlaylist,
    sendChatMessage,
    warnUser,
    kickUser,
    toggleMuteUser,
    endParty
  };
}
