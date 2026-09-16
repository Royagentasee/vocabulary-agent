// 可选：单独跑 tsc 类型检查（不影响 build）
import { resolvePackage } from './resolve.mjs'
import { spawn } from 'node:child_process'

const tscPath = `${resolvePackage('typescript')}/bin/tsc`
const child = spawn(process.execPath, [tscPath, '--noEmit'], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))