import { resolvePackage } from './resolve.mjs'
import { spawn } from 'node:child_process'

const viteBin = `${resolvePackage('vite')}/bin/vite.js`
const child = spawn(process.execPath, [viteBin, 'build'], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))