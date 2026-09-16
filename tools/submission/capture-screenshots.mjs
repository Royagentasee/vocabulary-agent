/**
 * 小程序截图自动化（基于 Playwright + 微信开发者工具 H5 模式）
 *
 * 工作流程：
 * 1. 把小程序 H5 build 产物部署到本地 http://localhost:5176
 * 2. 用 Playwright 截取关键页面
 * 3. 锐化处理 + 拼接到正确尺寸（750 × 1334）
 *
 * 用法：
 *   pnpm install
 *   node capture-screenshots.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const H5_URL = process.env.H5_URL ?? 'http://localhost:5176'
const OUTPUT_DIR = path.resolve('../screenshots')

// 关键页面 URL + 名称
const PAGES = [
  { name: '01-home', url: '/' },
  { name: '02-wordbooks', url: '/wordbooks' },
  { name: '03-review-meaning', url: '/review' },
  { name: '04-review-ai', url: '/review' },
  { name: '05-stats', url: '/stats' },
]

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 750, height: 1334 },
    deviceScaleFactor: 2,  // 高清
  })
  const page = await context.newPage()

  for (const p of PAGES) {
    console.log(`Capturing ${p.name}...`)
    await page.goto(`${H5_URL}${p.url}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)  // 等动画完成

    // 特殊处理 review-ai：点击 AI 解释按钮后再截
    if (p.name === '04-review-ai') {
      // 假设存在 AI 解释按钮
      const aiButton = await page.$('text=让 AI 解释, text=✨')
      if (aiButton) {
        await aiButton.click()
        await page.waitForTimeout(2000)
      }
    }

    const buffer = await page.screenshot({ fullPage: false })
    const filename = `${p.name}.png`
    await fs.writeFile(path.join(OUTPUT_DIR, filename), buffer)
    console.log(`  ✓ ${filename} (${buffer.length} bytes)`)
  }

  await browser.close()
  console.log(`\nAll screenshots saved to ${OUTPUT_DIR}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})