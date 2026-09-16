import { resolvePackage } from './resolve.mjs'
import { spawn } from 'node:child_process'

const vitestPath = resolvePackage('vitest')
const entry = `${vitestPath}/vitest.mjs`
const child = spawn(process.execPath, [entry], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))