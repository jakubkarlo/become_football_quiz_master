// Downloads the stadium data from the server into the local generated/stadiums/ (the reverse of stadiums:deploy),
// e.g. on a new machine instead of a several-minute `npm run fetch:stadiums`.
//
//   npm run stadiums:pull                   — download when there is no local data yet
//   npm run stadiums:pull -- --dry-run      — only show what would change locally
//   npm run stadiums:pull -- --force        — replace existing local data with the server's copy
//
// Target comes from STADIUMS_DEPLOY_TARGET in .env, the same as for stadiums:deploy.
// The index and continent files form one snapshot, so this never merges file by file: everything is downloaded
// into a staging directory, the index is validated, and only then the local directory is swapped for it.
// An interrupted or failed pull leaves the local data untouched.

import fs from 'fs'
import path from 'path'
import { fail, remoteTarget, requireTools, rsync } from './remote-sync.mjs'

const DATA_DIR = path.resolve('./generated/stadiums')
const STAGING_DIR = `${DATA_DIR}.pull`
const BACKUP_DIR = `${DATA_DIR}.bak`

const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')

const remote = remoteTarget('STADIUMS_DEPLOY_TARGET', 'deploy@quiz.example.com:/data/football-quiz/stadium-data')
requireTools()

const hasLocalData = fs.existsSync(path.join(DATA_DIR, 'index.json'))

if (dryRun) {
  rsync(['--delete', '--exclude', '*.tmp', remote, `${DATA_DIR}/`], 'Comparing local data with the server', { dryRun })
  console.log('\nDry run finished — nothing was changed locally.')
  if (hasLocalData && !force) console.log('Local data exists: the real run needs --force to replace it.')
  process.exit(0)
}

if (hasLocalData && !force) {
  fail(`Local stadium data already exists in ${path.relative(process.cwd(), DATA_DIR)}/ — it may be a fresh fetch not deployed yet.\n`
    + 'Run with --dry-run to see the differences, or --force to replace it with the server\'s copy.')
}

fs.rmSync(STAGING_DIR, { recursive: true, force: true })
fs.mkdirSync(STAGING_DIR, { recursive: true })
rsync(['--exclude', '*.tmp', remote, `${STAGING_DIR}/`], 'Downloading stadium data from the server')

// Same checks as stadiums:deploy, so a broken or empty server copy never replaces working local data
const stagedIndex = path.join(STAGING_DIR, 'index.json')
let index
try {
  index = JSON.parse(fs.readFileSync(stagedIndex, 'utf8'))
} catch (err) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true })
  fail(`The server has no valid index.json (${err.message}) — local data left untouched.`)
}
const countries = Object.keys(index.countries || {}).length
if (!countries) {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true })
  fail('The server index is empty — local data left untouched.')
}

// Swap directories: current → backup, staging → current, then drop the backup
fs.rmSync(BACKUP_DIR, { recursive: true, force: true })
if (fs.existsSync(DATA_DIR)) fs.renameSync(DATA_DIR, BACKUP_DIR)
fs.renameSync(STAGING_DIR, DATA_DIR)
fs.rmSync(BACKUP_DIR, { recursive: true, force: true })

console.log(`\nDone. ${countries} countries in ${path.relative(process.cwd(), DATA_DIR)}/`)
