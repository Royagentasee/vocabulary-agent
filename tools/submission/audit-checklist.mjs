/**
 * 提审清单自动检查
 *
 * 检查项：
 * 1. 小程序代码完整性（必要文件）
 * 2. AppID 是否填写
 * 3. 截图是否齐全（5 张）
 * 4. 协议文档是否存在
 * 5. 编译产物是否最新
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const MINI_DIR = path.resolve('../apps/mini')
const SCREENSHOTS_DIR = path.resolve('../screenshots')
const DOCS_DIR = path.resolve('../docs')

const checks = []
let failed = 0

function check(name, pass, message) {
  checks.push({ name, pass, message })
  if (!pass) failed++
  const icon = pass ? '✓' : '✗'
  const color = pass ? '\x1b[32m' : '\x1b[31m'
  console.log(`  ${color}${icon}\x1b[0m ${name}${message ? ': ' + message : ''}`)
}

console.log('\x1b[1m提审清单检查\x1b[0m\n')

// 1. 项目文件
console.log('\x1b[36m[1] 项目文件\x1b[0m')
const requiredFiles = [
  'project.config.json',
  'src/app.tsx',
  'src/app.config.ts',
  'src/app.css',
  'src/pages/index/index.tsx',
  'src/pages/wordbooks/index.tsx',
  'src/pages/review/index.tsx',
  'src/pages/stats/index.tsx',
  'src/pages/me/index.tsx',
  'src/pages/legal/user-agreement.tsx',
  'src/pages/legal/privacy-policy.tsx',
]
for (const f of requiredFiles) {
  const exists = await fs.access(path.join(MINI_DIR, f)).then(() => true).catch(() => false)
  check(`文件存在: ${f}`, exists)
}

// 2. AppID 检查
console.log('\n\x1b[36m[2] AppID\x1b[0m')
try {
  const config = JSON.parse(await fs.readFile(path.join(MINI_DIR, 'project.config.json'), 'utf-8'))
  const appid = config.appid
  const isValid = appid && appid !== 'touristappid' && appid.startsWith('wx')
  check(`AppID 已配置 (${appid})`, isValid)
} catch (e) {
  check('AppID 检查', false, e.message)
}

// 3. 截图
console.log('\n\x1b[36m[3] 截图\x1b[0m')
const requiredScreenshots = [
  '01-home.png',
  '02-wordbooks.png',
  '03-review-meaning.png',
  '04-review-ai.png',
  '05-stats.png',
]
let screenshotCount = 0
for (const s of requiredScreenshots) {
  const exists = await fs.access(path.join(SCREENSHOTS_DIR, s)).then(() => true).catch(() => false)
  if (exists) screenshotCount++
  check(`截图: ${s}`, exists)
}
check(`截图数量 (${screenshotCount}/5)`, screenshotCount >= 2)

// 4. 协议文档
console.log('\n\x1b[36m[4] 协议文档\x1b[0m')
const docs = [
  'legal/USER-AGREEMENT.md',
  'legal/PRIVACY-POLICY.md',
  'MINI-PUBLISH.md',
  'SCREENSHOTS-GUIDE.md',
]
for (const d of docs) {
  const exists = await fs.access(path.join(DOCS_DIR, d)).then(() => true).catch(() => false)
  check(`文档: ${d}`, exists)
}

// 5. 内容合规检查
console.log('\n\x1b[36m[5] 内容合规\x1b[0m')
try {
  const userAgreement = await fs.readFile(path.join(MINI_DIR, 'src/pages/legal/user-agreement.tsx'), 'utf-8')
  check('用户协议包含必要内容', /support@vocabulary-agent\.com/.test(userAgreement))
  check('用户协议提到服务说明', /Vocabulary Agent/.test(userAgreement))
} catch (e) {
  check('用户协议', false, e.message)
}

try {
  const privacyPolicy = await fs.readFile(path.join(MINI_DIR, 'src/pages/legal/privacy-policy.tsx'), 'utf-8')
  check('隐私政策包含必要内容', /privacy@vocabulary-agent\.com/.test(privacyPolicy))
  check('隐私政策提到第三方', /DeepSeek|微信|DeepSeek/.test(privacyPolicy))
} catch (e) {
  check('隐私政策', false, e.message)
}

// 6. 编译产物
console.log('\n\x1b[36m[6] 编译产物\x1b[0m')
const distExists = await fs.access(path.join(MINI_DIR, 'dist')).then(() => true).catch(() => false)
check('dist/ 目录存在', distExists)

// 7. 分包配置
console.log('\n\x1b[36m[7] 分包配置\x1b[0m')
try {
  const appConfig = await fs.readFile(path.join(MINI_DIR, 'src/app.config.ts'), 'utf-8')
  check('已配置分包', /subpackages/.test(appConfig))
} catch (e) {
  check('分包配置', false, e.message)
}

// 总结
console.log(`\n\x1b[1m总结\x1b[0m`)
console.log(`  通过: ${checks.length - failed}/${checks.length}`)
if (failed === 0) {
  console.log('\x1b[32m  ✓ 全部通过！可以提交审核\x1b[0m')
  process.exit(0)
} else {
  console.log(`\x1b[31m  ✗ ${failed} 项未通过，请修复后重试\x1b[0m`)
  process.exit(1)
}