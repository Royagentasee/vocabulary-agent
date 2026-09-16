// Expo dev server (Metro bundler)
import { resolvePackage } from './resolve.mjs'
import { spawn } from 'node:child_process'

const expoBin = `${resolvePackage('expo')}/bin/cli.js`

const child = spawn(process.execPath, [expoBin, 'start'], {
  stdio: 'inherit',
})
child.on('exit', (code) => process.exit(code ?? 0))