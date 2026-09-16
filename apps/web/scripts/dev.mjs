import { resolvePackage } from './resolve.mjs'
import { spawn } from 'node:child_process'

const vitePath = resolvePackage('vite')
const viteBin = `${vitePath}/bin/vite.js`

console.log(`Starting Vite dev server: ${viteBin}`)
const child = spawn(process.execPath, [viteBin], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))