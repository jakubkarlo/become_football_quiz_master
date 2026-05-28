import { kitsManifest } from 'virtual:kits-manifest'
import { getClub } from './clubsDb.js'

export { kitsManifest }

export function getSeasons() {
  return Object.keys(kitsManifest).sort().reverse()
}

export function getLeagues(season) {
  return (kitsManifest[season] || []).map(l => l.league)
}

export function buildClubList(selectedSeasons = [], selectedLeagues = []) {
  const seasons = selectedSeasons.length ? selectedSeasons : getSeasons()
  const seen = new Set()
  const result = []

  for (const season of seasons) {
    const leagueEntries = kitsManifest[season] || []
    for (const { league, clubs = [], altKits = {} } of leagueEntries) {
      if (selectedLeagues.length && !selectedLeagues.includes(league)) continue
      for (const { id, prefix, sep = '_', kits = [1, 2, 3] } of clubs) {
        const key = `${season}|${league}|${id}`
        if (seen.has(key)) continue
        seen.add(key)
        const filePrefix = prefix || id
        const kitBase = `/kits/${season}/${league}/${filePrefix}`
        const altUrls = (altKits[id] || []).map(f => `/kits/${season}/${league}/${f}`)
        result.push({ ...getClub(id), season, league, kitBase, sep, kits, altUrls })
      }
    }
  }
  return result
}

const kitLabels = { 1: 'domowa', 2: 'wyjazdowa', 3: 'trzecia', alt: 'alternatywna' }

export function generateQuestion(clubs, usedKeys = new Set(), selectedKitTypes = [1, 2, 3]) {
  const typeNums = selectedKitTypes.filter(t => typeof t === 'number')
  const includeAlt = selectedKitTypes.includes('alt')
  const candidates = []

  for (const c of clubs) {
    const availNums = (c.kits || [1, 2, 3]).filter(k => typeNums.includes(k))
    for (const n of availNums) {
      const key = `${c.season}|${c.league}|${c.id}_${n}`
      if (!usedKeys.has(key)) {
        candidates.push({ key, club: c, kitLabel: kitLabels[n], imageUrl: `${c.kitBase}${c.sep}${n}.png` })
      }
    }
    if (includeAlt) {
      for (let i = 0; i < (c.altUrls || []).length; i++) {
        const key = `${c.season}|${c.league}|${c.id}_alt_${i}`
        if (!usedKeys.has(key)) {
          candidates.push({ key, club: c, kitLabel: kitLabels.alt, imageUrl: c.altUrls[i] })
        }
      }
    }
  }

  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

export function getSuggestions(input, clubs) {
  const inp = normalize(input)
  if (inp.length < 1) return []
  const seen = new Set()
  return clubs.filter(c => {
    if (seen.has(c.id)) return false
    const targets = [c.name, ...c.aliases]
    if (targets.some(t => normalize(t).includes(inp))) { seen.add(c.id); return true }
    return false
  })
}

export function checkAnswer(input, club) {
  const inp = normalize(input).trim()
  if (inp.length < 2) return false
  return [club.name, ...club.aliases].some(t => {
    const n = normalize(t)
    return n === inp || n.split(/\s+/).includes(inp)
  })
}
