// Builds the kit manifest from the kits directory and (when run directly) writes it to <kitsDir>/manifest.json.
// The app fetches /kits/manifest.json at runtime, so kits can be updated on the server without a rebuild:
//   npm run kits:manifest                   — writes ./kits/manifest.json
//   node scripts/kits-manifest.mjs <dir>    — writes <dir>/manifest.json
// In development Vite serves the manifest generated on the fly (see vite.config.js).

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

function parseKitFilename(filename) {
  // augsburg_1.png style (underscore separator)
  let m = filename.match(/^(.+)_(\d+)\.png$/i)
  if (m) return { prefix: m[1], id: m[1].toLowerCase(), sep: '_', kitNum: parseInt(m[2]) }
  // feyenoord1.png / Celta3.png style (no separator)
  m = filename.match(/^(.+?)(\d+)\.png$/i)
  if (m) return { prefix: m[1], id: m[1].toLowerCase(), sep: '', kitNum: parseInt(m[2]) }
  return null
}

function extractAltClubId(filename) {
  let base = filename.replace(/\.png$/i, '').toLowerCase()
  base = base.replace(/_alt\d*$/, '')     // _alt, _alt1
  base = base.replace(/\d*alt\d*$/, '')   // 1alt, 2alt, 1alt1
  base = base.replace(/_alt\d*$/, '')     // second pass after digit removal
  base = base.replace(/_\d+$/, '')        // _4, _5
  base = base.replace(/\d+$/, '')         // trailing digit
  return base.replace(/\s+/g, '_').trim()
}

// Directory layout:
//   clubs:  kits/<continent>/<Country>/<League>/<Season>/<club>_<n>.png
//   nations: kits/nations/<Confederation>/<Season>/<nation><n>.png
// Each season dir may hold an alt/ (or Alt/) subdirectory with alternative kits.
function scanSeasonDir(leagueDir) {
  const allEntries = fs.readdirSync(leagueDir)

  // Parse main kit files
  const clubMap = new Map() // id → { prefix, sep, kits: Set }
  for (const f of allEntries.filter(f => f.toLowerCase().endsWith('.png'))) {
    const parsed = parseKitFilename(f)
    if (!parsed) continue
    const { prefix, id, sep, kitNum } = parsed
    if (!clubMap.has(id)) clubMap.set(id, { prefix, sep, kits: new Set() })
    clubMap.get(id).kits.add(kitNum)
  }

  // Scan alt/ or Alt/ subdirectory
  const altDirName = allEntries.find(f =>
    f.toLowerCase() === 'alt' && fs.statSync(path.join(leagueDir, f)).isDirectory()
  )
  const altKits = {}
  if (altDirName) {
    for (const f of fs.readdirSync(path.join(leagueDir, altDirName)).filter(f => f.toLowerCase().endsWith('.png'))) {
      const clubId = extractAltClubId(f)
      if (clubId) {
        if (!altKits[clubId]) altKits[clubId] = []
        altKits[clubId].push(`${altDirName}/${f}`)
      }
    }
  }

  const clubs = [...clubMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, { prefix, sep, kits }]) => {
      const entry = { id, kits: [...kits].sort((a, b) => a - b) }
      if (prefix !== id) entry.prefix = prefix
      if (sep !== '_') entry.sep = sep
      return entry
    })

  return { clubs, ...(Object.keys(altKits).length ? { altKits } : {}) }
}

// → { [season]: [{ league, dir, kind: 'club' | 'nation', region, clubs, altKits? }] }
// league is "<Country> - <League>" for clubs and the confederation name for nations;
// region is the continent dir (e.g. "europe") for clubs and the confederation for nations.
export function buildManifest(kitsDir) {
  if (!fs.existsSync(kitsDir)) return {}
  const subdirs = dir => fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory()).sort()
  const result = {}
  const add = (season, entry) => (result[season] ||= []).push(entry)

  for (const top of subdirs(kitsDir)) {
    if (top === 'nations') {
      for (const conf of subdirs(path.join(kitsDir, top))) {
        for (const season of subdirs(path.join(kitsDir, top, conf))) {
          const dir = `${top}/${conf}/${season}`
          add(season, { league: conf, dir, kind: 'nation', region: conf, ...scanSeasonDir(path.join(kitsDir, dir)) })
        }
      }
      continue
    }
    for (const country of subdirs(path.join(kitsDir, top))) {
      for (const leagueName of subdirs(path.join(kitsDir, top, country))) {
        for (const season of subdirs(path.join(kitsDir, top, country, leagueName))) {
          const dir = `${top}/${country}/${leagueName}/${season}`
          add(season, { league: `${country} - ${leagueName}`, dir, kind: 'club', region: top, ...scanSeasonDir(path.join(kitsDir, dir)) })
        }
      }
    }
  }
  for (const leagues of Object.values(result)) leagues.sort((a, b) => a.league.localeCompare(b.league))
  return result
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const kitsDir = path.resolve(process.argv[2] || './kits')
  if (!fs.existsSync(kitsDir)) {
    console.error(`Kits directory not found: ${kitsDir}`)
    process.exit(1)
  }
  const manifest = buildManifest(kitsDir)
  const out = path.join(kitsDir, 'manifest.json')
  fs.writeFileSync(out, JSON.stringify(manifest))
  const leagues = Object.values(manifest).reduce((n, l) => n + l.length, 0)
  console.log(`Wrote ${out}: ${Object.keys(manifest).length} seasons, ${leagues} league-seasons`)
}
