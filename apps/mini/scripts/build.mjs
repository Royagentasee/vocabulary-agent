// Build Taro for 微信小程序
import { resolvePackage } from './resolve.mjs'
import { spawn } from 'node:child_process'

const taroCliPath = `${resolvePackage('@tarojs/cli')}/bin/taro`

console.log(`Taro CLI: ${taroCliPath}`)
const child = spawn(process.execPath, [taroCliPath, 'build', '--type', 'weapp'], {
  stdio: 'inherit',
})
child.on('exit', (code) => process.exit(code ?? 0))