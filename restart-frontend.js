const { spawn } = require('child_process');
const child = spawn('C:\\Program Files\\nodejs\\node.exe', ['node_modules/vite/bin/vite.js', '--host', '--port', '5173'], {
  cwd: 'e:\\project\\ERP2026\\inventory-system\\frontend',
  detached: true,
  stdio: 'ignore'
});
child.unref();
console.log('Frontend started');