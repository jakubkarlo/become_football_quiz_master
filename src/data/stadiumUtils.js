import generatedStadiums from './stadiums.json'
import { getOverride } from './stadiumsOverrides.js'

// Commons serves a scaled thumbnail for Special:FilePath when ?width is given.
const IMAGE_WIDTH = 1280

// Minimum-capacity presets shown in settings; 0 = no limit.
export const CAPACITY_THRESHOLDS = [0, 10000, 20000, 40000]

const allStadiums = generatedStadiums
  .map(s => {
    const override = getOverride(s.id)
    if (!override) return s
    const { aliases = [], ...fields } = override
    return { ...s, ...fields, aliases: [...s.aliases, ...aliases] }
  })
  .filter(s => !s.exclude)
  .map(s => ({ ...s, imageUrl: `${s.image}?width=${IMAGE_WIDTH}` }))

function unique(values) {
  return [...new Set(values)].sort()
}

export function getContinents() {
  return unique(allStadiums.map(s => s.continent))
}

export function getCountries(selectedContinents = []) {
  return unique(allStadiums
    .filter(s => !selectedContinents.length || selectedContinents.includes(s.continent))
    .map(s => s.country))
}

export function buildStadiumList(selectedContinents = [], selectedCountries = [], minCapacity = 0) {
  return allStadiums.filter(s =>
    (!selectedContinents.length || selectedContinents.includes(s.continent)) &&
    (!selectedCountries.length || selectedCountries.includes(s.country)) &&
    s.capacity >= minCapacity
  )
}

const IMAGE_TIMEOUT_MS = 15000

function shuffle(items) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Resolves true once the browser has the image (it is then served from cache), false on error/timeout.
function preloadImage(url) {
  return new Promise(resolve => {
    const img = new Image()
    const timer = setTimeout(() => {
      console.warn(`Stadium image timed out: ${url}`)
      img.src = ''
      resolve(false)
    }, IMAGE_TIMEOUT_MS)
    img.onload = () => { clearTimeout(timer); resolve(true) }
    img.onerror = () => {
      clearTimeout(timer)
      console.warn(`Stadium image failed to load: ${url}`)
      resolve(false)
    }
    img.src = url
  })
}

// Picks `size` random stadiums and preloads their photos in parallel.
// A stadium whose photo fails is replaced by the next one from the pool, so the deck
// can come back shorter than `size` only when the pool runs out.
export async function prepareStadiumDeck(stadiums, size, onProgress = () => {}) {
  const pool = shuffle(stadiums)
  const target = Math.min(size, pool.length)
  const deck = []
  let next = 0

  async function worker() {
    while (deck.length < target && next < pool.length) {
      const stadium = pool[next++]
      if (await preloadImage(stadium.imageUrl) && deck.length < target) {
        deck.push(stadium)
        onProgress(deck.length, target)
      }
    }
  }

  await Promise.all(Array.from({ length: target }, worker))
  return deck
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
