// Uploads the locally generated stadium data (generated/stadiums/, from `npm run fetch:stadiums`) to the server
// directory served by nginx as /stadium-data (see docker-compose.yml). The app build never touches Wikidata —
// regenerate the JSON only when you want fresher data, then run this.
//
//   npm run stadiums:deploy                 — upload continent files, then the index, then remove stale files
//   npm run stadiums:deploy -- --dry-run    — only show what would change
//
// Target comes from STADIUMS_DEPLOY_TARGET in .env, e.g. deploy@quiz.example.com:/data/football-quiz/stadium-data

import fs from 'fs'
import path from 'path'
import { fail, remoteTarget, requireTools, rsync, NGINX_READABLE } from './remote-sync.mjs'

const DATA_DIR = path.resolve('./generated/stadiums')
const INDEX_FILE = path.join(DATA_DIR, 'index.json')

const dryRun = process.argv.includes('--dry-run')

const remote = remoteTarget('STADIUMS_DEPLOY_TARGET', 'deploy@quiz.example.com:/data/football-quiz/stadium-data')
if (!fs.existsSync(INDEX_FILE)) fail('No stadium data — run `npm run fetch:stadiums` first.')
let index
try { index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) } catch (err) { fail(`Invalid ${INDEX_FILE}: ${err.message}`) }
const countries = Object.keys(index.countries || {}).length
if (!countries) fail('The stadium index is empty — refusing to upload it.')
requireTools()
console.log(`Index: ${countries} countries`)

// Continent files first, then the index that references them, stale files last —
// a visitor never gets an index pointing at a missing continent file.
const opts = { dryRun, chmod: NGINX_READABLE }
rsync(['--exclude', 'index.json', '--exclude', '*.tmp', `${DATA_DIR}/`, remote], 'Uploading continent files', opts)
rsync([INDEX_FILE, remote], 'Uploading index.json', opts)
rsync(['--delete', '--exclude', 'index.json', '--exclude', '*.tmp', `${DATA_DIR}/`, remote], 'Removing stale files', opts)

console.log(dryRun ? '\nDry run finished — nothing was changed on the server.' : '\nDone. The app uses the new data on the next visit to the stadium scope screen.')
