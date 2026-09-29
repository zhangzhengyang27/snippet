/**
 * 重启后端 dev 进程：终止旧 node dist/main，重新拉起（让新 dist 生效）。
 */
const { spawn } = require('child_process')

const OLD_PID = process.argv[2]
const SERVER_DIR = '/Users/xiaoye/Desktop/html5-examples/server'

if (!OLD_PID) {
  console.error('用法: node scripts/restart_backend.cjs <oldPid>')
  process.exit(1)
}

try {
  process.kill(Number(OLD_PID), 'SIGTERM')
  console.log(`已终止旧进程 ${OLD_PID}`)
} catch (e) {
  console.log(`终止旧进程 ${OLD_PID} 失败或已退出: ${e.message}`)
}

setTimeout(() => {
  const child = spawn('node', ['dist/main'], {
    cwd: SERVER_DIR,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  console.log(`已启动新后端进程 PID ${child.pid}`)
}, 1500)
