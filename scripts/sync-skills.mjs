/* eslint-env node */

/**
 * Mirrors `.agents/skills/` (the source of truth, read natively by Codex, Cursor, Cline,
 * Amp and friends) into `.claude/skills/`, which is the only place Claude Code looks.
 *
 * Both trees are committed so a fresh clone works in every agent with no setup. That
 * means the copy can drift, so this script exists to make re-syncing a single command:
 *
 *   pnpm skills:sync     rewrite .claude/skills/ from .agents/skills/
 *   pnpm skills:check    exit 1 if they differ, without writing anything
 *
 * Symlinking would avoid the duplication, but this repo has core.symlinks=false and git
 * on Windows turns committed symlinks into plain files holding the target path.
 */

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, '.agents', 'skills')
const target = join(root, '.claude', 'skills')
const check = process.argv.includes('--check')

function walk(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

if (!existsSync(source)) {
  console.error(`No skills source at ${relative(root, source)}`)
  process.exit(1)
}

const files = walk(source).map((path) => relative(source, path))
const stale = walk(target)
  .map((path) => relative(target, path))
  .filter((path) => !files.includes(path))

const changed = files.filter((path) => {
  const to = join(target, path)
  return !existsSync(to) || readFileSync(to, 'utf8') !== readFileSync(join(source, path), 'utf8')
})

if (check) {
  if (changed.length === 0 && stale.length === 0) {
    console.log(`.claude/skills is in sync (${files.length} file(s))`)
    process.exit(0)
  }
  for (const path of changed) console.error(`out of date: ${path}`)
  for (const path of stale) console.error(`stale: ${path}`)
  console.error('\nRun `pnpm skills:sync` to fix.')
  process.exit(1)
}

for (const path of stale) rmSync(join(target, path))
for (const path of changed) {
  const to = join(target, path)
  mkdirSync(dirname(to), { recursive: true })
  writeFileSync(to, readFileSync(join(source, path)))
}

const summary = [
  changed.length ? `${changed.length} written` : null,
  stale.length ? `${stale.length} removed` : null
].filter(Boolean)

console.log(summary.length ? `Synced .claude/skills: ${summary.join(', ')}` : 'Already in sync')
