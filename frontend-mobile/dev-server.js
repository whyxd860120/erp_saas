const { spawn } = require('child_process')
const path = require('path')

const child = spawn('npx', ['uni'], {
  cwd: __dirname,
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
})

child.on('error', (err) => {
  console.error('启动失败:', err.message)
  process.exit(1)
})

child.on('exit', (code) => {
  console.log(`进程退出，退出码: ${code}`)
})
