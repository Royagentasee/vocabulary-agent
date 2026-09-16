// Build: Vite 单独跑 bundling（自带的 esbuild 处理 TS），
// 不依赖 tsc 类型检查（用 typecheck 脚本单独跑）。
import { resolvePackage } from './resolve.mjs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const vitePackagePath = resolvePackage('vite')
const viteBin = `${vitePackagePath}/bin/vite.js`

// 不传 cwd，让子进程继承当前工作目录（即 apps/web/）。
// 把 .pnpm 目录加到 NODE_PATH，让 esbuild 等子依赖能被找到
const pnpmStore = path.resolve(__dirname, '..', '..', '..', 'node_modules', '.pnpm')

console.log(`Vite build: ${viteBin}`)
console.log(`Vite cwd:   ${__dirname}/..`)

const child = spawn(process.execPath, [viteBin, 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_PATH: pnpmStore,
  },
})
child.on('exit', (code) => process.exit(code ?? 0))