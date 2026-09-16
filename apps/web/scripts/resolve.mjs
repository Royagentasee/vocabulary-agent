/**
 * 在 pnpm store (.pnpm/<pkg>@<version>_.../node_modules/<pkg>) 中查找真实包路径。
 * 跨 Windows / POSIX，使用 path.join。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..', '..')

/**
 * 在 .pnpm 目录里找名为 <package> 的目录，返回它的 node_modules/<package> 路径。
 */
export function resolveFromPnpm(packageName) {
  const pnpmRoot = path.join(ROOT, 'node_modules', '.pnpm')
  if (!fs.existsSync(pnpmRoot)) {
    throw new Error(`.pnpm directory not found: ${pnpmRoot}. Run pnpm install first.`)
  }
  const entries = fs.readdirSync(pnpmRoot)
  // .pnpm 中条目形如：vite@5.4.21_@types+node@...
  const prefix = packageName.replace('/', '+') + '@'
  const matches = entries.filter((e) => e.startsWith(prefix))
  if (matches.length === 0) {
    throw new Error(`Package "${packageName}" not found in .pnpm. Available similar: ${entries.filter((e) => e.includes(packageName.split('/')[1] || packageName)).slice(0, 5).join(', ')}`)
  }
  // 选第一个（pnpm install 同一包只会出现一个版本）
  return path.join(pnpmRoot, matches[0], 'node_modules', packageName)
}

/**
 * 在 apps/web/node_modules 或 .pnpm 中查找包路径，优先 apps/web 直接依赖。
 */
export function resolvePackage(packageName) {
  // 1. 直接检查 apps/web/node_modules/<packageName>
  const localPath = path.join(__dirname, '..', 'node_modules', packageName)
  if (fs.existsSync(localPath)) return localPath
  // 2. fall back to .pnpm
  return resolveFromPnpm(packageName)
}

export { ROOT }