// Stadium data is not part of the app build. `npm run fetch:stadiums` generates it locally into generated/stadiums/,
// `npm run stadiums:deploy` uploads it to the server, and the app fetches it at runtime:
// the small index when the settings screen opens, continent files only when a quiz starts.
import { getOverride } from './stadiumsOverrides.js'
import { prepareDeck, shuffle } from './deck.js'
import { getLocale } from '../i18n/index.js'

const DATA_BASE = (import.meta.env.VITE_STADIUM_DATA_URL || '/stadium-data').replace(/\/+$/, '')
const KEY = /^[a-z_]+$/
const COMMONS_FILE = 'https://commons.wikimedia.org/wiki/Special:FilePath/'

async function fetchJson(file) {
  // no-cache = revalidate: uploaded data shows up without a redeploy, unchanged files cost a 304
  const res = await fetch(`${DATA_BASE}/${file}`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`Stadium data request failed: ${file} → ${res.status}`)
  return res.json()
}

// Commons serves a scaled thumbnail for Special:FilePath when ?width is given.
const IMAGE_WIDTH = 1280

// Minimum-capacity presets shown in settings; 0 = no limit.
export const CAPACITY_THRESHOLDS = [0, 10000, 20000, 40000]

function applyOverride(stadium) {
  const override = getOverride(stadium.id)
  if (!override) return stadium
  const { aliases = [], ...fields } = override
  return { ...stadium, ...fields, aliases: [...(stadium.aliases || []), ...aliases] }
}

let indexPromise = null

// Resolves to { countries: { [key]: { name, continent, stadiums: [{ id, capacity }] } } }
// with overrides applied, so counts in settings match what the quiz will play.
// Data comes from the server — malformed entries are skipped, not trusted.
export function loadStadiumIndex() {
  indexPromise ??= fetchJson('index.json').then(index => {
    if (!index || typeof index.countries !== 'object') throw new Error('Invalid stadium index')
    const countries = {}
    for (const [key, c] of Object.entries(index.countries)) {
      if (!KEY.test(key) || typeof c?.name !== 'string' || !KEY.test(c.continent) || !Array.isArray(c.stadiums)) continue
      const stadiums = c.stadiums
        .filter(entry => Array.isArray(entry) && /^Q\d+$/.test(entry[0]) && Number.isFinite(entry[1]))
        .map(([id, capacity]) => applyOverride({ id, capacity }))
        .filter(s => !s.exclude)
      if (stadiums.length) countries[key] = { name: c.name, continent: c.continent, stadiums }
    }
    return { countries }
  }).catch(err => {
    indexPromise = null // allow a retry instead of caching the failure
    throw err
  })
  return indexPromise
}

function unique(values) {
  return [...new Set(values)].sort()
}

export function getContinents(index) {
  return unique(Object.values(index.countries).map(c => c.continent))
}

export function getCountries(index, selectedContinents = []) {
  return Object.entries(index.countries)
    .filter(([, c]) => !selectedContinents.length || selectedContinents.includes(c.continent))
    .sort(([, a], [, b]) => a.name.localeCompare(b.name, getLocale()))
    .map(([key]) => key)
}

export function getCountryName(index, key) {
  return index.countries[key]?.name || key
}

function selectedCountryKeys(index, selectedContinents, selectedCountries) {
  return getCountries(index, selectedContinents)
    .filter(key => !selectedCountries.length || selectedCountries.includes(key))
}

export function countStadiums(index, selectedContinents = [], selectedCountries = [], minCapacity = 0) {
  return selectedCountryKeys(index, selectedContinents, selectedCountries)
    .reduce((sum, key) => sum + index.countries[key].stadiums.filter(s => s.capacity >= minCapacity).length, 0)
}

const continentCache = new Map()

const isStadiumRecord = s => s && /^Q\d+$/.test(s.id) && typeof s.stadiumName === 'string'
  && typeof s.image === 'string' && s.image.startsWith(COMMONS_FILE) && Array.isArray(s.aliases)

function loadContinent(continent) {
  if (!KEY.test(continent)) return Promise.reject(new Error(`Invalid continent "${continent}"`))
  if (!continentCache.has(continent)) {
    continentCache.set(continent, fetchJson(`continents/${continent}.json`).then(list => (Array.isArray(list) ? list : [])
      .filter(isStadiumRecord)
      .map(applyOverride)
      .filter(s => !s.exclude)
      .map(s => ({ ...s, imageUrl: `${s.image}?width=${IMAGE_WIDTH}` })))
      .catch(err => {
        continentCache.delete(continent) // allow a retry instead of caching the failure
        throw err
      }))
  }
  return continentCache.get(continent)
}

// Loads only the continent files the selection needs and returns the matching full stadium records.
export async function loadStadiumList(index, selectedContinents = [], selectedCountries = [], minCapacity = 0) {
  const keys = new Set(selectedCountryKeys(index, selectedContinents, selectedCountries))
  const continents = unique([...keys].map(key => index.countries[key].continent))
  const lists = await Promise.all(continents.map(loadContinent))
  return lists.flat().filter(s => keys.has(s.country) && s.capacity >= minCapacity)
}

// Picks `size` random stadiums and preloads their photos (see deck.js).
export function prepareStadiumDeck(stadiums, size, onProgress) {
  return prepareDeck(shuffle(stadiums), size, onProgress)
}

function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

// Suggestions also match the city and the clubs, so a stadium can be found by its team.
export function getSuggestions(input, stadiums) {
  const inp = normalize(input)
  if (inp.length < 1) return []
  const seen = new Set()
  return stadiums.filter(s => {
    if (seen.has(s.id)) return false
    const targets = [s.stadiumName, s.city, ...s.aliases, ...(s.clubs || []), ...(s.clubAliases || [])]
    if (targets.some(t => normalize(t).includes(inp))) { seen.add(s.id); return true }
    return false
  })
}

// Only the stadium's own names count — city and clubs are hints, typing them must not score.
export function checkAnswer(input, stadium) {
  const inp = normalize(input).trim()
  if (inp.length < 2) return false
  const targets = [stadium.stadiumName, ...stadium.aliases]
  return targets.some(t => {
    const n = normalize(t)
    return n === inp || n.split(/\s+/).some(w => w === inp)
  })
}
