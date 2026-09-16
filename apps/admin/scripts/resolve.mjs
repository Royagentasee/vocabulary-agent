import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..', '..')

export function resolveFromPnpm(packageName) {
  const pnpmRoot = path.join(ROOT, 'node_modules', '.pnpm')
  if (!fs.existsSync(pnpmRoot)) throw new Error('.pnpm not found')
  const entries = fs.readdirSync(pnpmRoot)
  const prefix = packageName.replace('/', '+') + '@'
  const matches = entries.filter((e) => e.startsWith(prefix))
  if (matches.length === 0) throw new Error(`Package "${packageName}" not found`)
  return path.join(pnpmRoot, matches[0], 'node_modules', packageName)
}

export function resolvePackage(packageName) {
  const localPath = path.join(__dirname, '..', 'node_modules', packageName)
  if (fs.existsSync(localPath)) return localPath
  return resolveFromPnpm(packageName)
}