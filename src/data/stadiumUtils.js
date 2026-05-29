import { stadiumsManifest } from 'virtual:stadiums-manifest'
import { getStadium } from './stadiumsDb.js'

export { stadiumsManifest }

export function getContinents() {
  return Object.keys(stadiumsManifest).sort()
}

export function getCountries(selectedContinents = []) {
  const continents = selectedContinents.length ? selectedContinents : getContinents()
  const seen = new Set()
  return continents
    .flatMap(c => Object.keys(stadiumsManifest[c] || {}).sort())
    .filter(c => seen.has(c) ? false : (seen.add(c), true))
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function parseId(id) {
  const parts = id.split('_')
  return {
    stadiumName: parts.slice(0, -1).map(capitalize).join(' '),
    city: capitalize(parts[parts.length - 1]),
    aliases: [],
  }
}

export function buildStadiumList(selectedContinents = [], selectedCountries = []) {
  const continents = selectedContinents.length ? selectedContinents : getContinents()
  const result = []
  for (const continent of continents) {
    for (const country of Object.keys(stadiumsManifest[continent] || {}).sort()) {
      if (selectedCountries.length && !selectedCountries.includes(country)) continue
      for (const { id, file } of stadiumsManifest[continent][country] || []) {
        const entry = getStadium(id) || parseId(id)
        result.push({
          id,
          stadiumName: entry.stadiumName,
          city: entry.city,
          aliases: entry.aliases || [],
          continent,
          country,
          imageUrl: `/stadiums/${continent}/${country}/${file}`,
        })
      }
    }
  }
  return result
}

export function generateStadiumQuestion(stadiums, usedKeys = new Set()) {
  const candidates = stadiums.filter(s => !usedKeys.has(s.id))
  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

export function getSuggestions(input, stadiums) {
  const inp = normalize(input)
  if (inp.length < 1) return []
  const seen = new Set()
  return stadiums.filter(s => {
    if (seen.has(s.id)) return false
    const targets = [s.stadiumName, s.city, ...s.aliases]
    if (targets.some(t => normalize(t).includes(inp))) { seen.add(s.id); return true }
    return false
  })
}

export function checkAnswer(input, stadium) {
  const inp = normalize(input).trim()
  if (inp.length < 2) return false
  const targets = [stadium.stadiumName, stadium.city, ...stadium.aliases]
  return targets.some(t => {
    const n = normalize(t)
    return n === inp || n.split(/\s+/).some(w => w === inp)
  })
}
