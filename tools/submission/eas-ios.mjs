/**
 * iOS TestFlight 自动化脚本
 *
 * 工作流程：
 * 1. 检查 EAS CLI 安装
 * 2. 配置 Apple 凭据（首次）
 * 3. 构建 IPA
 * 4. 上传到 App Store Connect / TestFlight
 *
 * 用法：
 *   node eas-ios.mjs --profile development
 *   node eas-ios.mjs --profile production --submit
 */
import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const MOBILE_DIR = path.resolve('../apps/mobile')

async function step(name, fn) {
  console.log(`\n\x1b[36m=== ${name} ===\x1b[0m`)
  await fn()
}

async function checkEAS() {
  try {
    execSync('eas --version', { stdio: 'pipe' })
  } catch {
    console.log('安装 EAS CLI...')
    execSync('npm install -g eas-cli', { stdio: 'inherit' })
  }
}

async function configureCredentials() {
  console.log('配置 Apple 凭据（首次）...')
  console.log('  → 在浏览器中登录 Apple Developer')
  console.log('  → 选择 Generate a new Apple Distribution Certificate')
  console.log('  → EAS 会自动上传并管理')

  execSync('cd .. && eas credentials:configure --platform ios', { stdio: 'inherit' })
}

async function build(profile) {
  console.log(`构建 IPA (profile: ${profile})...`)
  execSync(`cd .. && eas build --platform ios --profile ${profile} --non-interactive`, { stdio: 'inherit' })
}

async function submit() {
  console.log('上传到 App Store Connect...')
  execSync('cd .. && eas submit --platform ios --latest --non-interactive', { stdio: 'inherit' })
}

async function checkBundleId() {
  const appJson = JSON.parse(await fs.readFile(path.join(MOBILE_DIR, 'app.json'), 'utf-8'))
  const bundleId = appJson.expo.ios?.bundleIdentifier
  console.log(`Bundle ID: ${bundleId}`)
  if (!bundleId || !bundleId.startsWith('com.')) {
    throw new Error('请先在 app.json 配置合法的 Bundle ID（如 com.vocabagent.app）')
  }
  return bundleId
}

async function main() {
  const args = process.argv.slice(2)
  let profile = 'development'
  let shouldSubmit = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile') profile = args[i + 1]
    if (args[i] === '--submit') shouldSubmit = true
  }

  console.log('\x1b[1m=== Vocabulary Agent iOS TestFlight 上传工具 ===\x1b[0m')
  console.log(`Profile: ${profile}`)
  console.log(`Submit: ${shouldSubmit}`)

  await step('1) 检查 EAS CLI', checkEAS)
  await step('2) 检查 Bundle ID', checkBundleId)
  await step('3) 配置 Apple 凭据', configureCredentials)
  await step('4) 构建', () => build(profile))

  if (shouldSubmit) {
    await step('5) 上传到 App Store Connect', submit)
    console.log('\n\x1b[32m✓ iOS 构建已上传到 App Store Connect\x1b[0m')
    console.log('  → TestFlight 中分发给测试者')
    console.log('  → 通过审核后 App Store 上线')
  } else {
    console.log('\n\x1b[33m构建完成但未上传。运行 --submit 上传到 App Store Connect\x1b[0m')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})