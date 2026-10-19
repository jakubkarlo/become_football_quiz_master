// Uploads the local kits directory to the server volume served by nginx (see docker-compose.yml).
//
//   npm run kits:deploy                 — regenerate manifest.json and sync kits/ to the server
//   npm run kits:deploy -- --dry-run    — only show what would be uploaded / deleted
//   npm run kits:deploy -- --keep       — do not delete server files that are missing locally
//
// Target comes from KITS_DEPLOY_TARGET (in .env, not committed), e.g. deploy@quiz.example.com:/data/football-quiz/kits
// Requires rsync and ssh with key access to the server.
//
// Order matters for visitors in the middle of a quiz: new images go up first, then the manifest that
// references them, and only at the end are stale files deleted — the live manifest never points to a missing file.

import fs from 'fs'
import path from 'path'
import { buildManifest } from './kits-manifest.mjs'
import { fail, remoteTarget, requireTools, rsync, NGINX_READABLE } from './remote-sync.mjs'

const KITS_DIR = path.resolve('./kits')

const dryRun = process.argv.includes('--dry-run')
const keep = process.argv.includes('--keep')

const remote = remoteTarget('KITS_DEPLOY_TARGET', 'deploy@quiz.example.com:/data/football-quiz/kits')
if (!fs.existsSync(KITS_DIR)) fail(`Kits directory not found: ${KITS_DIR}`)
requireTools()

// 1. Manifest from the local tree
const manifest = buildManifest(KITS_DIR)
const manifestFile = path.join(KITS_DIR, 'manifest.json')
const leagueSeasons = Object.values(manifest).reduce((n, l) => n + l.length, 0)
if (!leagueSeasons) fail('No kits found — refusing to upload an empty manifest.')
fs.writeFileSync(manifestFile, JSON.stringify(manifest))
console.log(`Manifest: ${Object.keys(manifest).length} seasons, ${leagueSeasons} league-seasons`)

// 2. Images (no deletions yet), 3. manifest, 4. stale files
const opts = { dryRun, chmod: NGINX_READABLE }
rsync(['--exclude', 'manifest.json', `${KITS_DIR}/`, remote], 'Uploading kit images', opts)
rsync([manifestFile, remote], 'Uploading manifest.json', opts)
if (!keep) rsync(['--delete', '--exclude', 'manifest.json', `${KITS_DIR}/`, remote], 'Removing files deleted locally', opts)

console.log(dryRun ? '\nDry run finished — nothing was changed on the server.' : '\nDone. The app picks up the new manifest on the next visit to the kit scope screen.')
