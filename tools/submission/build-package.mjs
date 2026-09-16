/**
 * 一键打包小程序提审包
 *
 * 1. 编译小程序
 * 2. 截图（如已有则跳过）
 * 3. 检查清单
 * 4. 打包成 zip
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = path.resolve('../..')
const MINI_DIR = path.resolve('../apps/mini')
const OUTPUT = path.resolve('../dist-submission')

async function main() {
  console.log('=== Vocabulary Agent 小程序提审打包 ===\n')

  await fs.mkdir(OUTPUT, { recursive: true })

  // 1. 编译
  console.log('1) 编译小程序...')
  try {
    execSync('cd .. && pnpm install', { stdio: 'inherit' })
    execSync(`cd .. && pnpm --filter @vocab-agent/mini build`, { stdio: 'inherit' })
  } catch (e) {
    console.error('编译失败:', e.message)
    process.exit(1)
  }

  // 2. 复制 dist
  console.log('\n2) 复制编译产物...')
  await fs.cp(path.join(MINI_DIR, 'dist'), path.join(OUTPUT, 'dist'), { recursive: true })

  // 3. 复制协议文档
  console.log('\n3) 复制协议文档...')
  await fs.mkdir(path.join(OUTPUT, 'docs'), { recursive: true })
  await fs.cp(path.resolve('../docs/legal'), path.join(OUTPUT, 'docs/legal'), { recursive: true })
  await fs.cp(path.resolve('../docs/MINI-PUBLISH.md'), path.join(OUTPUT, 'docs/MINI-PUBLISH.md'))
  await fs.cp(path.resolve('../docs/SCREENSHOTS-GUIDE.md'), path.join(OUTPUT, 'docs/SCREENSHOTS-GUIDE.md'))

  // 4. 截图（如已有）
  const screensDir = path.resolve('../screenshots')
  if (await fs.access(screensDir).then(() => true).catch(() => false)) {
    console.log('\n4) 复制截图...')
    await fs.cp(screensDir, path.join(OUTPUT, 'screenshots'), { recursive: true })
  }

  // 5. 审核检查
  console.log('\n5) 审核清单检查...')
  try {
    execSync('node audit-checklist.mjs', { stdio: 'inherit' })
  } catch {
    console.error('审核清单未通过，请修复')
    process.exit(1)
  }

  console.log('\n=== 提审包已生成 ===')
  console.log(`位置: ${OUTPUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})