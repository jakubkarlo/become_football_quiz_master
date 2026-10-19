// Downloads the kits directory from the server volume into the local kits/ (the reverse of kits:deploy).
//
//   npm run kits:pull                   — download new and changed files; local-only files are kept
//   npm run kits:pull -- --dry-run      — only show what would be downloaded / deleted
//   npm run kits:pull -- --mirror       — make kits/ an exact copy of the server (deletes local-only files)
//
// Target comes from KITS_DEPLOY_TARGET in .env, the same as for kits:deploy.
// Files changed on both sides: the newer one wins (--update), so a fresher local edit is never overwritten.

import fs from 'fs'
import path from 'path'
import { remoteTarget, requireTools, rsync } from './remote-sync.mjs'

const KITS_DIR = path.resolve('./kits')

const dryRun = process.argv.includes('--dry-run')
const mirror = process.argv.includes('--mirror')

const remote = remoteTarget('KITS_DEPLOY_TARGET', 'deploy@quiz.example.com:/data/football-quiz/kits')
requireTools()
if (!dryRun) fs.mkdirSync(KITS_DIR, { recursive: true })

if (mirror && !dryRun) {
  console.log('--mirror: local files that are not on the server will be DELETED. Run with --dry-run first to see which.')
}

rsync([
  '--update',
  ...(mirror ? ['--delete'] : []),
  remote, `${KITS_DIR}/`,
], mirror ? 'Mirroring kits from the server' : 'Downloading kits from the server', { dryRun })

console.log(dryRun ? '\nDry run finished — nothing was changed locally.' : `\nDone. Kits are in ${path.relative(process.cwd(), KITS_DIR) || '.'}/`)
