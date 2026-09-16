// Expo: EAS Build (远程打包，适合无 Mac / 无 Android Studio 的开发机)
// 用法：
//   pnpm --filter @vocab-agent/mobile build:android    # 打包 APK / AAB
//   pnpm --filter @vocab-agent/mobile build:ios        # 打包 IPA
//   pnpm --filter @vocab-agent/mobile build:web        # 打包 Web
import { resolvePackage } from './resolve.mjs'
import { spawn } from 'node:child_process'

const expoBin = `${resolvePackage('expo')}/bin/cli.js`
const platform = process.argv[2] || 'android'

const args = platform === 'web' ? ['export', '--platform', 'web'] : ['build:' + platform]
const child = spawn(process.execPath, [expoBin, ...args], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))