import { resolvePackage } from './resolve.mjs'
import { spawn } from 'node:child_process'

const tauriBin = `${resolvePackage('@tauri-apps/cli')}/tauri.js`
const child = spawn(process.execPath, [tauriBin, 'dev'], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))