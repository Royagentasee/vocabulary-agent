/**
 * 小程序提交审核助手
 *
 * 工作流程：
 * 1. 编译小程序
 * 2. 自动截图（如缺）
 * 3. 审核清单检查
 * 4. 启动微信开发者工具自动上传（如已配置 CLI）
 * 5. 输出提审包
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = path.resolve('../..')
const MINI_DIR = path.resolve('../apps/mini')
const SUBMISSION_DIR = path.resolve('../dist-submission')

async function step(name, fn) {
  console.log(`\n\x1b[36m=== ${name} ===\x1b[0m`)
  try {
    await fn()
  } catch (e) {
    console.error(`\x1b[31m✗ ${name} 失败: ${e.message}\x1b[0m`)
    process.exit(1)
  }
}

async function build() {
  console.log('编译小程序...')
  execSync('cd .. && pnpm install', { stdio: 'inherit' })
  execSync('cd .. && pnpm --filter @vocab-agent/mini build', { stdio: 'inherit' })
}

async function checkScreenshots() {
  const screensDir = path.resolve('../screenshots')
  try {
    const files = await fs.readdir(screensDir)
    const required = ['01-home.png', '02-wordbooks.png', '03-review-meaning.png', '04-review-ai.png', '05-stats.png']
    const missing = required.filter((f) => !files.includes(f))
    if (missing.length > 0) {
      console.log(`\x1b[33m⚠ 缺少截图: ${missing.join(', ')}\x1b[0m`)
      console.log('  运行 cd tools/submission && node capture-screenshots.mjs')
    } else {
      console.log('  ✓ 截图齐全')
    }
  } catch {
    console.log('\x1b[33m⚠ screenshots/ 不存在，请运行 capture-screenshots.mjs\x1b[0m')
  }
}

async function auditChecklist() {
  console.log('审核清单检查...')
  execSync('node audit-checklist.mjs', { stdio: 'inherit' })
}

async function packageSubmission() {
  console.log('生成提审包...')
  await fs.mkdir(SUBMISSION_DIR, { recursive: true })

  // 复制 dist
  await fs.cp(path.join(MINI_DIR, 'dist'), path.join(SUBMISSION_DIR, 'dist'), { recursive: true })

  // 复制 docs
  await fs.mkdir(path.join(SUBMISSION_DIR, 'docs'), { recursive: true })
  await fs.cp(path.resolve('../docs/legal'), path.join(SUBMISSION_DIR, 'docs/legal'), { recursive: true })
  await fs.cp(path.resolve('../docs/MINI-PUBLISH.md'), path.join(SUBMISSION_DIR, 'docs/MINI-PUBLISH.md'))
  await fs.cp(path.resolve('../docs/SCREENSHOTS-GUIDE.md'), path.join(SUBMISSION_DIR, 'docs/SCREENSHOTS-GUIDE.md'))

  // 复制截图
  try {
    await fs.cp(path.resolve('../screenshots'), path.join(SUBMISSION_DIR, 'screenshots'), { recursive: true })
  } catch {}

  console.log(`  ✓ 提审包: ${SUBMISSION_DIR}`)
}

async function openWeChatDevtools() {
  console.log('\n打开微信开发者工具...')
  // 查找微信开发者工具路径
  const possiblePaths = [
    'C:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
    'C:\\Tencent\\微信web开发者工具\\cli.bat',
    '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
  ]
  let cliPath = null
  for (const p of possiblePaths) {
    try {
      await fs.access(p)
      cliPath = p
      break
    } catch {}
  }

  if (!cliPath) {
    console.log('\x1b[33m未找到微信开发者工具 CLI\x1b[0m')
    console.log('  请手动打开微信开发者工具 → 导入 dist-submission/dist/ → 上传')
    return
  }

  const distPath = path.join(SUBMISSION_DIR, 'dist')
  const child = spawn(cliPath, ['-o', distPath, '--upload', '1.0.0', 'Vocabulary Agent v1.0.0'], {
    stdio: 'inherit',
  })
  child.on('exit', (code) => {
    if (code === 0) console.log('\x1b[32m  ✓ 上传成功\x1b[0m')
    else console.log('\x1b[31m  ✗ 上传失败\x1b[0m')
  })
}

async function main() {
  console.log('\x1b[1m=== Vocabulary Agent 小程序提审助手 ===\x1b[0m\n')

  await step('1) 编译', build)
  await step('2) 检查截图', checkScreenshots)
  await step('3) 审核清单', auditChecklist)
  await step('4) 生成提审包', packageSubmission)
  await step('5) 微信开发者工具', openWeChatDevtools)

  console.log('\n\x1b[32m✓ 提审包准备完成\x1b[0m')
  console.log('\n接下来：')
  console.log('  1. 打开 mp.weixin.qq.com')
  console.log('  2. 版本管理 → 找到上传的版本 → 提交审核')
  console.log('  3. 等待 1-3 天审核结果')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})