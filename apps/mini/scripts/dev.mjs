// Dev: Taro watch mode for 微信小程序
import { resolvePackage } from './resolve.mjs'
import { spawn } from 'node:child_process'

const taroCliPath = `${resolvePackage('@tarojs/cli')}/bin/taro`

console.log(`Taro dev: ${taroCliPath}`)
const child = spawn(process.execPath, [taroCliPath, 'build', '--type', 'weapp', '--watch'], {
  stdio: 'inherit',
})
child.on('exit', (code) => process.exit(code ?? 0))