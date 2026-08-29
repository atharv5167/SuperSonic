const { io } = require('socket.io-client');

const target = process.env.LOAD_TEST_URL || 'http://localhost:3001';
const users = Number(process.env.LOAD_TEST_USERS || 2000);
const roomCount = Math.min(Number(process.env.LOAD_TEST_ROOMS || 200), users);
const joinTimeoutMs = 15000;
const sockets = [];
const joinedAt = new Map();
const joinLatencies = [];
const eventLatencies = [];
let controlSentAt = 0;

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function joinOne(index) {
  return new Promise((resolve, reject) => {
    const roomId = `LOAD-${String(index % roomCount).padStart(4, '0')}`;
    const socket = io(target, { transports: ['websocket'], reconnection: false, timeout: joinTimeoutMs });
    const started = Date.now();
    const isHost = index % roomCount === 0;
    sockets.push(socket);

    const timer = setTimeout(() => reject(new Error(`join timeout for user ${index}`)), joinTimeoutMs);
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.on('playback:state_changed', () => {
      if (controlSentAt) eventLatencies.push(Date.now() - controlSentAt);
    });
    socket.on('connect', () => {
      if (isHost) {
        socket.emit('room:init', { roomId, hostId: `load-host-${roomId}`, hostName: 'Load Test Host', roomName: roomId }, () => {});
      }
      socket.emit('room:join', {
        roomId,
        userId: isHost ? `load-host-${roomId}` : `load-user-${index}`,
        username: `Load User ${index}`,
        isHost
      }, (response) => {
        clearTimeout(timer);
        if (!response?.success) return reject(new Error(response?.error || `join failed for ${index}`));
        joinedAt.set(socket.id, Date.now());
        joinLatencies.push(Date.now() - started);
        resolve({ socket, roomId, isHost });
      });
    });
  });
}

async function main() {
  console.log(`Load test: ${users} users across ${roomCount} rooms -> ${target}`);
  // Create all rooms/hosts first so participant joins do not race room creation.
  const hostResults = await Promise.all(Array.from({ length: roomCount }, (_, index) => joinOne(index)));
  const participantResults = await Promise.all(
    Array.from({ length: users - roomCount }, (_, offset) => joinOne(offset + roomCount))
  );
  const results = [...hostResults, ...participantResults];
  const hosts = results.filter((result) => result.isHost);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  controlSentAt = Date.now();
  for (const { socket, roomId } of hosts) socket.emit('playback:play', { roomId, trackIndex: 0, position: 0 });
  await new Promise((resolve) => setTimeout(resolve, 3000));
  console.log(JSON.stringify({
    users, roomCount, connected: sockets.filter((socket) => socket.connected).length,
    joinMs: { p50: percentile(joinLatencies, 0.5), p95: percentile(joinLatencies, 0.95), max: Math.max(...joinLatencies) },
    eventMs: { samples: eventLatencies.length, p50: percentile(eventLatencies, 0.5), p95: percentile(eventLatencies, 0.95), max: percentile(eventLatencies, 1) }
  }, null, 2));
  sockets.forEach((socket) => socket.close());
}

main().catch((error) => {
  console.error(error);
  sockets.forEach((socket) => socket.close());
  process.exitCode = 1;
});
