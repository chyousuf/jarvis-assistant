const { spawn } = require('child_process');
const path = require('path');

const rootLauncher = path.resolve(__dirname, '../start.js');

console.log('⚡ Launching J.A.R.V.I.S. (forwarding to root launcher)...');

const proc = spawn('node', [rootLauncher], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

proc.on('exit', (code) => {
  process.exit(code || 0);
});
