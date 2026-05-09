import { access, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

// 使用脚本自身位置推导包根目录，兼容 monorepo 下从任意 cwd 执行的场景
const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, '..')
const defaultCliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const cliPath = process.env.WECHAT_DEVTOOLS_CLI_PATH || defaultCliPath
// 支持传入绝对路径（由 dev-mp-weixin.mjs 调用时传入）或相对路径（手动调用时）
const inputPath = process.argv[2] || 'dist/dev/mp-weixin'
const projectDir = resolve(inputPath) === inputPath
  ? inputPath
  : resolve(projectRoot, inputPath)
const port = process.env.WEAPP_DEVTOOLS_PORT || '9420'

async function assertFile(path, message) {
  try {
    await access(path)
  } catch {
    throw new Error(message)
  }
}

async function main() {
  await assertFile(cliPath, `未找到微信开发者工具 CLI: ${cliPath}`)
  await assertFile(
    resolve(projectDir, 'app.json'),
    `未找到小程序编译产物: ${resolve(projectDir, 'app.json')}`,
  )

  const appJsonStat = await stat(resolve(projectDir, 'app.json'))
  console.log(`[devtools] 打开微信开发者工具: ${projectDir}`)
  console.log(`[devtools] app.json 更新时间: ${appJsonStat.mtime.toLocaleString()}`)

  const child = spawn(cliPath, ['auto', '--project', projectDir, '--auto-port', port], {
    stdio: 'inherit',
  })

  child.on('exit', (code) => {
    if (code && code !== 0) {
      process.exitCode = code
    }
  })
}

main().catch((error) => {
  console.error(`[devtools] ${error.message}`)
  process.exit(1)
})
