const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Launching SuperSonic Jamming Platform...');

// 1. Start Socket.IO Real-Time Sync Server
const serverProcess = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  shell: true
});

// 2. Start Next.js Development Server
const nextProcess = spawn('npx', ['next', 'dev', '-p', '3000'], {
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n🛑 Shutting down SuperSonic servers...');
  serverProcess.kill();
  nextProcess.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
