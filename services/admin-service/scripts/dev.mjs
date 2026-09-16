import { resolvePackage } from './resolve.mjs'
import { spawn } from 'node:child_process'

const nestBin = `${resolvePackage('@nestjs/cli')}/bin/nest.js`
const child = spawn(process.execPath, [nestBin, 'start', '--watch'], { stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))