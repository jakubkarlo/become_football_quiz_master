import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

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

// Directory layout: kits/<Country>/<League>/<Season>/<club>_<n>.png (+ optional alt/ subdirectory)
function buildManifest() {
  const kitsDir = path.resolve('./kits')
  if (!fs.existsSync(kitsDir)) return {}
  const subdirs = dir => fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory()).sort()
  const result = {}

  for (const country of subdirs(kitsDir)) {
    for (const leagueName of subdirs(path.join(kitsDir, country))) {
      for (const season of subdirs(path.join(kitsDir, country, leagueName))) {
        const league = `${country} - ${leagueName}`
        const dir = `${country}/${leagueName}/${season}`
        const leagueDir = path.join(kitsDir, dir)
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

        if (!result[season]) result[season] = []
        result[season].push({
          league,
          dir,
          clubs,
          ...(Object.keys(altKits).length ? { altKits } : {}),
        })
      }
    }
  }
  for (const leagues of Object.values(result)) leagues.sort((a, b) => a.league.localeCompare(b.league))
  return result
}

function kitsManifestPlugin() {
  const virtualId = 'virtual:kits-manifest'
  const resolvedId = '\0' + virtualId
  return {
    name: 'kits-manifest',
    resolveId(id) { if (id === virtualId) return resolvedId },
    load(id) {
      if (id === resolvedId) return `export const kitsManifest = ${JSON.stringify(buildManifest())}`
    },
  }
}

function buildStadiumsManifest() {
  const stadiumsDir = path.resolve('./stadiums')
  if (!fs.existsSync(stadiumsDir)) return {}
  const isDir = f => fs.statSync(f).isDirectory()
  const result = {}

  for (const continent of fs.readdirSync(stadiumsDir).filter(f => isDir(path.join(stadiumsDir, f))).sort()) {
    const continentDir = path.join(stadiumsDir, continent)
    const countries = {}
    for (const country of fs.readdirSync(continentDir).filter(f => isDir(path.join(continentDir, f))).sort()) {
      const files = fs.readdirSync(path.join(continentDir, country))
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .map(f => ({ id: f.replace(/\.[^.]+$/, '').toLowerCase(), file: f }))
        .sort((a, b) => a.id.localeCompare(b.id))
      if (files.length) countries[country] = files
    }
    if (Object.keys(countries).length) result[continent] = countries
  }
  return result
}

function stadiumsManifestPlugin() {
  const virtualId = 'virtual:stadiums-manifest'
  const resolvedId = '\0' + virtualId
  return {
    name: 'stadiums-manifest',
    resolveId(id) { if (id === virtualId) return resolvedId },
    load(id) {
      if (id === resolvedId) return `export const stadiumsManifest = ${JSON.stringify(buildStadiumsManifest())}`
    },
  }
}

export default defineConfig({
  plugins: [react(), kitsManifestPlugin(), stadiumsManifestPlugin()],
})
