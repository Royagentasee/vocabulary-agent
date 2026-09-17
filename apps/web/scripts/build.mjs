// Build: 直接用 Vite 的编程式 API 构建。
//
// 说明：早先的实现是 spawn 一个 node 子进程去跑 vite，
// 在 Windows 上会偶发崩溃（exit 0xC0000409），这里改为同进程内调用，
// 更稳也更快。类型检查请单独跑 `pnpm typecheck`。
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

let vite
try {
  vite = await import('vite')
} catch {
  // 兜底：直接从 pnpm store 里解析
  const { resolvePackage } = await import('./resolve.mjs')
  const pkgPath = resolvePackage('vite')
  vite = await import(pathToFileURL(`${pkgPath}/dist/node/index.js`).href)
}

console.log('Vite build (in-process):', root)
await vite.build({ root })
