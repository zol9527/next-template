import { access, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const projectRoot = process.cwd()
const uniBin = resolve(projectRoot, 'node_modules/.bin/uni')
const devOutputDir = resolve(projectRoot, 'dist/dev/mp-weixin')
const appJsonPath = resolve(devOutputDir, 'app.json')
const devtoolsScript = resolve(projectRoot, 'scripts/open-wechat-devtools.mjs')
const startedAt = Date.now()

let devtoolsOpened = false
let compileStarted = false

async function fileUpdatedAfterStart(path) {
  try {
    const fileStat = await stat(path)
    return fileStat.mtimeMs >= startedAt - 1000
  } catch {
    return false
  }
}

function openDevToolsOnce() {
  if (devtoolsOpened) {
    return
  }
  devtoolsOpened = true

  const child = spawn(process.execPath, [devtoolsScript, devOutputDir], {
    stdio: 'inherit',
  })

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[dev] 微信开发者工具启动失败，退出码: ${code}`)
    }
  })
}

async function waitForFirstCompile() {
  while (!devtoolsOpened) {
    if (compileStarted && await fileUpdatedAfterStart(appJsonPath)) {
      openDevToolsOnce()
      return
    }
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 500))
  }
}

async function main() {
  try {
    await access(uniBin)
  } catch {
    throw new Error('未找到 uni CLI，请先执行 npm install')
  }

  console.log('[dev] 启动 uni-app 微信小程序开发编译...')
  const uni = spawn(uniBin, ['-p', 'mp-weixin'], {
    cwd: projectRoot,
    env: process.env,
  })

  uni.stdout.on('data', (chunk) => {
    const text = chunk.toString()
    process.stdout.write(text)
    if (text.includes('Compiling')) {
      compileStarted = true
    }
    if (text.includes('DONE') || text.includes('Build complete')) {
      openDevToolsOnce()
    }
  })

  uni.stderr.on('data', (chunk) => {
    const text = chunk.toString()
    process.stderr.write(text)
    if (text.includes('Compiling')) {
      compileStarted = true
    }
  })

  uni.on('exit', (code, signal) => {
    if (signal) {
      process.exit(0)
    }
    process.exit(code ?? 0)
  })

  const stop = () => {
    uni.kill('SIGTERM')
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)

  await waitForFirstCompile()
}

main().catch((error) => {
  console.error(`[dev] ${error.message}`)
  process.exit(1)
})
