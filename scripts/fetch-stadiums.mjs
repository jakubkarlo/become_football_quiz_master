// Fetches football stadiums from Wikidata and writes generated/stadiums/ (not tracked by git):
//   index.json               — countries (Polish name, continent) and [id, capacity] of every stadium;
//                              small, loaded by the settings screen for filters and counts
//   continents/<key>.json    — full stadium records, loaded lazily only for the continents being played
// Images are not downloaded — the app hotlinks Wikimedia Commons thumbnails.
//
// Usage: npm run fetch:stadiums                          — re-fetch every continent
//        npm run fetch:stadiums -- --continent asia     — re-fetch only the listed continent(s), comma-separated
//        node scripts/fetch-stadiums.mjs --if-missing    — fetch only when the data is absent
// Each continent is saved (its file + index entries) as soon as it is fetched, so a failed run
// keeps the continents finished before the failure; re-run with --continent for the rest.
// Manual corrections (aliases, exclusions) live in src/data/stadiumsOverrides.js, not here,
// so they survive re-fetching.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ENDPOINT = 'https://query.wikidata.org/sparql'
// Wikimedia User-Agent policy: identify the tool and give a contact point.
const USER_AGENT = 'football-quiz-practice/0.1 (stadium data import; https://www.wikidata.org/wiki/Wikidata:Data_access)'
const OUTPUT_DIR = fileURLToPath(new URL('../generated/stadiums', import.meta.url))
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.json')
const MIN_CAPACITY = 5000

const CONCURRENCY = 4      // Wikidata allows up to 5 parallel queries per client
const MAX_ATTEMPTS = 3

// Which countries to fetch. Each region is either an explicit country list or a Wikidata continent
// (all sovereign states on it). `continent` must match a key in src/data/geoLabels.js.
// A country is assigned to the first region that lists it, so explicit regions go first.
const EUROPE = [
  'Q36',   // Poland
  'Q145',  // United Kingdom (England, Scotland, Wales, Northern Ireland are not states in Wikidata)
  'Q29',   // Spain
  'Q38',   // Italy
  'Q183',  // Germany
  'Q142',  // France
  'Q31',   // Belgium
  'Q55',   // Netherlands
  'Q213',  // Czech Republic
  'Q41',   // Greece
  'Q224',  // Croatia
]
// Not a continent in Wikidata (it is part of North America) — the seven isthmus states.
const CENTRAL_AMERICA = ['Q774', 'Q242', 'Q783', 'Q792', 'Q811', 'Q800', 'Q804']
const WD_EUROPE = 'Q46'
const WD_AFRICA = 'Q15'

const REGIONS = [
  { continent: 'europe', countries: EUROPE },
  { continent: 'central_america', countries: CENTRAL_AMERICA },
  { continent: 'north_america', wikidataContinent: 'Q49' },
  { continent: 'south_america', wikidataContinent: 'Q18' },
  { continent: 'africa', wikidataContinent: WD_AFRICA },
  // Transcontinental states partly in Europe (Russia, Turkey, Kazakhstan, ...) play in UEFA — not Asia.
  { continent: 'asia', wikidataContinent: 'Q48', excludeContinents: [WD_EUROPE, WD_AFRICA] },
]

// Per-country tweaks; everything else uses the defaults.
// nameLang    — label language used as the stadium name (the other one becomes an alias).
//               Default 'en': Polish labels of foreign stadiums are often stale sponsor names.
// metroAreas  — areas whose stadiums all get one city name (London stadiums sit in boroughs).
const COUNTRY_OPTIONS = {
  Q36: { nameLang: 'pl' },
  Q145: { metroAreas: { Q23306: 'Londyn' } },
}

const SOVEREIGN_STATE = 'Q3624078'
const FOOTBALL = 'Q2736'
const FOOTBALL_VENUE = 'Q1154710'
// Occupants accepted as a club: football club / football team outright (FC Barcelona is the latter),
// sports and multi-sport clubs (Boca Juniors) only when association football is one of their sports.
// National teams, seasons and tournaments — also listed as occupants — fall outside these types.
const FOOTBALL_CLUB_TYPES = ['Q476028', 'Q103229495']
const SPORTS_CLUB_TYPES = ['Q847017', 'Q13580678']
const CITY = 'Q515'
const TOWN = 'Q3957'

function buildQuery({ qid, metroAreas = {} }) {
  const metroIds = Object.keys(metroAreas).map(id => `wd:${id}`).join(' ')
  return `
SELECT ?stadium
       (SAMPLE(?namePl) AS ?pl) (SAMPLE(?nameEn) AS ?en)
       (MAX(?cap) AS ?capacity) (SAMPLE(?coordRaw) AS ?coord) (SAMPLE(?img) AS ?image)
       (SAMPLE(?cityPl) AS ?city) (SAMPLE(?cityEn) AS ?cityFallback)
       (SAMPLE(?admPl) AS ?adm) (SAMPLE(?admEn) AS ?admFallback) (SAMPLE(?metroItem) AS ?metro)
       (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aliases)
WHERE {
  ?stadium wdt:P17 wd:${qid};
           wdt:P1083 ?cap;
           wdt:P625 ?coordRaw;
           wdt:P18 ?img.
  { ?stadium wdt:P641 wd:${FOOTBALL}. } UNION { ?stadium wdt:P31/wdt:P279* wd:${FOOTBALL_VENUE}. }
  FILTER(?cap >= ${MIN_CAPACITY})
  # Skip demolished / closed venues
  FILTER NOT EXISTS { ?stadium wdt:P576 [] }

  OPTIONAL { ?stadium rdfs:label ?namePl. FILTER(LANG(?namePl) = "pl") }
  OPTIONAL { ?stadium rdfs:label ?nameEn. FILTER(LANG(?nameEn) = "en") }
  OPTIONAL { ?stadium skos:altLabel ?alias. FILTER(LANG(?alias) IN ("pl", "en")) }

  # P131 is often a district/commune — prefer the nearest enclosing city/town, fall back to P131 itself.
  # Polish labels first, English when there is no Polish one (smaller foreign towns).
  OPTIONAL {
    ?stadium wdt:P131 ?admUnit.
    OPTIONAL { ?admUnit rdfs:label ?admPl. FILTER(LANG(?admPl) = "pl") }
    OPTIONAL { ?admUnit rdfs:label ?admEn. FILTER(LANG(?admEn) = "en") }
  }
  OPTIONAL {
    ?stadium wdt:P131/wdt:P131* ?cityItem.
    VALUES ?settlement { wd:${CITY} wd:${TOWN} }
    ?cityItem wdt:P31/wdt:P279* ?settlement.
    OPTIONAL { ?cityItem rdfs:label ?cityPl. FILTER(LANG(?cityPl) = "pl") }
    OPTIONAL { ?cityItem rdfs:label ?cityEn. FILTER(LANG(?cityEn) = "en") }
  }
  ${metroIds ? `OPTIONAL { VALUES ?metroItem { ${metroIds} } ?stadium wdt:P131+ ?metroItem. }` : ''}
}
GROUP BY ?stadium
ORDER BY DESC(?capacity)`
}

// Current occupants of the given stadiums: P466 (occupant) on the stadium or P115 (home venue) on the club.
// Statements with an end date or deprecated rank are dropped in code. Kept deliberately light —
// joining the club details here makes Wikidata time out, so they come from buildClubDetailsQuery.
function buildOccupantsQuery(stadiumIds) {
  return `
SELECT ?stadium ?club ?end ?rank WHERE {
  VALUES ?stadium { ${stadiumIds.map(id => `wd:${id}`).join(' ')} }
  { ?stadium p:P466 ?st. ?st ps:P466 ?club. }
  UNION
  { ?club p:P115 ?st. ?st ps:P115 ?stadium. }
  ?st wikibase:rank ?rank.
  OPTIONAL { ?st pq:P582 ?end }
}`
}

// Is it a (not dissolved) football club, how well known is it (Wikipedia sitelinks), Polish/English names.
function buildClubDetailsQuery(clubIds) {
  return `
SELECT ?club ?pl ?en ?links ?dissolved ?type ?playsFootball WHERE {
  VALUES ?club { ${clubIds.map(id => `wd:${id}`).join(' ')} }
  ?club wikibase:sitelinks ?links.
  OPTIONAL { ?club wdt:P576 ?dissolved }
  OPTIONAL { VALUES ?type { ${[...FOOTBALL_CLUB_TYPES, ...SPORTS_CLUB_TYPES].map(id => `wd:${id}`).join(' ')} } ?club wdt:P31 ?type. }
  OPTIONAL { ?club wdt:P641 wd:${FOOTBALL}. BIND(1 AS ?playsFootball) }
  OPTIONAL { ?club rdfs:label ?pl. FILTER(LANG(?pl) = "pl") }
  OPTIONAL { ?club rdfs:label ?en. FILTER(LANG(?en) = "en") }
}`
}

// Countries of a region with their Polish/English names.
function buildCountriesQuery({ countries, wikidataContinent, excludeContinents = [] }) {
  const scope = countries
    ? `VALUES ?country { ${countries.map(id => `wd:${id}`).join(' ')} }`
    : `?country wdt:P31 wd:${SOVEREIGN_STATE}; wdt:P30 wd:${wikidataContinent}.
  ${excludeContinents.map(id => `FILTER NOT EXISTS { ?country wdt:P30 wd:${id} }`).join('\n  ')}`
  return `
SELECT ?country (SAMPLE(?labelPl) AS ?pl) (SAMPLE(?labelEn) AS ?en) WHERE {
  ${scope}
  OPTIONAL { ?country rdfs:label ?labelPl. FILTER(LANG(?labelPl) = "pl") }
  OPTIONAL { ?country rdfs:label ?labelEn. FILTER(LANG(?labelEn) = "en") }
}
GROUP BY ?country`
}

// Retries rate limiting (429) and server errors/timeouts (5xx) with backoff; other errors fail at once.
async function runQuery(query) {
  for (let attempt = 1; ; attempt++) {
    // POST: queries with long id lists do not fit in a GET URL (HTTP 431)
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      body: new URLSearchParams({ query }),
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
    })
    if (res.ok) return (await res.json()).results.bindings
    const retryable = res.status === 429 || res.status >= 500
    if (!retryable || attempt >= MAX_ATTEMPTS) throw new Error(`SPARQL request failed: HTTP ${res.status}`)
    const retryAfter = Number(res.headers.get('retry-after')) || 5 * attempt
    console.warn(`HTTP ${res.status}, retrying in ${retryAfter}s (attempt ${attempt}/${MAX_ATTEMPTS})`)
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
  }
}

// Runs `fn` over items with at most `limit` calls in flight; results keep the input order.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

// "Czech Republic" → "czech_republic", "Côte d'Ivoire" → "cote_d_ivoire"
function slugify(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

const qidOf = uri => uri.split('/').pop()

// Resolves REGIONS into a flat country list; a country belongs to the first region that yields it.
async function resolveCountries() {
  const seen = new Set()
  const countries = []
  for (const region of REGIONS) {
    const rows = await runQuery(buildCountriesQuery(region))
    for (const row of rows) {
      const qid = qidOf(row.country.value)
      const en = row.en?.value
      if (!en || seen.has(qid)) continue
      seen.add(qid)
      countries.push({
        qid,
        key: slugify(en),
        countryName: row.pl?.value || en,
        continent: region.continent,
        nameLang: 'en',
        ...COUNTRY_OPTIONS[qid],
      })
    }
  }
  return countries
}

// "Point(16.8586 52.3967)" → [lat, lon]
function parseCoord(wkt) {
  const m = /^Point\(([-\d.]+) ([-\d.]+)\)$/.exec(wkt || '')
  return m ? [Number(m[2]), Number(m[1])] : null
}

// Data comes from an external service — only accept Commons FilePath URLs.
function parseImage(raw) {
  let url
  try { url = new URL(raw.replace(/^http:/, 'https:')) } catch { return null }
  if (url.hostname !== 'commons.wikimedia.org' || !url.pathname.startsWith('/wiki/Special:FilePath/')) return null
  const fileName = decodeURIComponent(url.pathname.slice('/wiki/Special:FilePath/'.length))
  return {
    image: url.href,
    imageSource: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName.replace(/ /g, '_'))}`,
  }
}

// Administrative unit names → plain city names: "City of Leeds", "Metropolitan Borough of Wigan", "Glasgow City"
function cleanCity(name) {
  return name
    .replace(/^(City and County of|City of|(London |Metropolitan |Royal )?Borough of|District of) /, '')
    .replace(/ City$/, '')
}

function toRecord(row, country) {
  const id = row.stadium.value.split('/').pop()
  const otherLang = country.nameLang === 'en' ? 'pl' : 'en'
  const name = row[country.nameLang]?.value || row[otherLang]?.value
  const metroId = row.metro?.value.split('/').pop()
  const coord = parseCoord(row.coord?.value)
  const img = parseImage(row.image?.value)
  if (!/^Q\d+$/.test(id) || !name || !img) {
    console.warn(`Skipping ${id}: missing name or invalid image`)
    return null
  }
  const aliases = new Set((row.aliases?.value || '').split('|').filter(Boolean))
  if (row[otherLang]?.value) aliases.add(row[otherLang].value)
  aliases.delete(name)
  return {
    id,
    stadiumName: name,
    city: country.metroAreas?.[metroId]
      || cleanCity(row.city?.value || row.cityFallback?.value || row.adm?.value || row.admFallback?.value || ''),
    country: country.key,
    countryName: country.countryName,
    continent: country.continent,
    capacity: Math.round(Number(row.capacity.value)),
    coord,
    ...img,
    aliases: [...aliases],
  }
}

const chunk = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))

const BATCH_SIZE = 150
// Shared grounds keep several clubs (San Siro, Olimpico). A club is kept only when it has at least this share
// of the best-known club's sitelinks — drops reserve teams and stray occupants Wikidata lists next to the main club.
const MAX_CLUBS = 4
const CLUB_MIN_SHARE = 0.25

// Adds `clubs` (Polish names, at most MAX_CLUBS) and `clubAliases` (English names) to the records in place.
async function attachClubs(records) {
  const occupants = new Map() // stadium id → Set of club ids
  for (const ids of chunk(records.map(r => r.id), BATCH_SIZE)) {
    for (const row of await runQuery(buildOccupantsQuery(ids))) {
      if (row.end || row.rank.value.endsWith('DeprecatedRank')) continue
      const stadium = qidOf(row.stadium.value)
      if (!occupants.has(stadium)) occupants.set(stadium, new Set())
      occupants.get(stadium).add(qidOf(row.club.value))
    }
  }

  // One row per (club, matching type) — collect the types first, decide per club afterwards
  const facts = new Map()
  const clubIds = [...new Set([...occupants.values()].flatMap(set => [...set]))].filter(id => /^Q\d+$/.test(id))
  for (const ids of chunk(clubIds, BATCH_SIZE * 2)) {
    for (const row of await runQuery(buildClubDetailsQuery(ids))) {
      const id = qidOf(row.club.value)
      if (!facts.has(id)) {
        facts.set(id, {
          name: row.pl?.value || row.en?.value, en: row.en?.value, links: Number(row.links.value),
          dissolved: Boolean(row.dissolved), playsFootball: Boolean(row.playsFootball), types: new Set(),
        })
      }
      if (row.type) facts.get(id).types.add(qidOf(row.type.value))
    }
  }
  const details = new Map()
  for (const [id, f] of facts) {
    const isClub = FOOTBALL_CLUB_TYPES.some(t => f.types.has(t))
      || (f.playsFootball && SPORTS_CLUB_TYPES.some(t => f.types.has(t)))
    if (isClub && !f.dissolved && f.name) details.set(id, f)
  }

  for (const record of records) {
    const byName = new Map() // the same club can exist twice (football section + multi-sport club)
    for (const c of [...(occupants.get(record.id) || [])].map(id => details.get(id)).filter(Boolean)) {
      if (!byName.has(c.name) || byName.get(c.name).links < c.links) byName.set(c.name, c)
    }
    const clubs = [...byName.values()].sort((a, b) => b.links - a.links)
    const kept = clubs.slice(0, MAX_CLUBS).filter(c => c.links >= clubs[0].links * CLUB_MIN_SHARE)
    record.clubs = kept.map(c => c.name)
    record.clubAliases = kept.map(c => c.en).filter(en => en && !record.clubs.includes(en))
  }
}

// --continent europe,asia → only these continents; others keep their existing files.
function parseContinentArg(known) {
  const i = process.argv.indexOf('--continent')
  if (i === -1) return null
  const only = (process.argv[i + 1] || '').split(',').filter(Boolean)
  const unknown = only.filter(c => !known.includes(c))
  if (!only.length || unknown.length) {
    throw new Error(`--continent expects a comma-separated list of: ${known.join(', ')}`)
  }
  return only
}

function readIndex() {
  if (!fs.existsSync(INDEX_FILE)) return { countries: {} }
  return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'))
}

// Write to a temp file and rename, so an interrupted run never leaves a half-written file.
function writeJson(file, data, pretty = false) {
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(data, null, pretty ? 2 : 0) + '\n')
  fs.renameSync(`${file}.tmp`, file)
}

const continentFile = continent => path.join(OUTPUT_DIR, 'continents', `${continent}.json`)

// Saves one continent and refreshes its entries in the index right away,
// so a failure later in the run keeps every continent finished so far.
function saveContinent(continent, stadiums, countries, index) {
  writeJson(continentFile(continent), stadiums, true)
  for (const [key, c] of Object.entries(index.countries)) {
    if (c.continent === continent) delete index.countries[key]
  }
  for (const c of countries) {
    const own = stadiums.filter(s => s.country === c.key)
    if (own.length) {
      index.countries[c.key] = { name: c.countryName, continent, stadiums: own.map(s => [s.id, s.capacity]) }
    }
  }
  writeJson(INDEX_FILE, index)
}

// Drops files and index entries of continents no longer in REGIONS.
function pruneContinents(known, index) {
  for (const file of fs.readdirSync(path.join(OUTPUT_DIR, 'continents'))) {
    if (!known.includes(file.replace(/\.json(\.tmp)?$/, ''))) fs.rmSync(path.join(OUTPUT_DIR, 'continents', file))
  }
  for (const [key, c] of Object.entries(index.countries)) {
    if (!known.includes(c.continent)) delete index.countries[key]
  }
  writeJson(INDEX_FILE, index)
}

async function main() {
  if (process.argv.includes('--if-missing') && fs.existsSync(INDEX_FILE)) return
  const known = [...new Set(REGIONS.map(r => r.continent))]
  const only = parseContinentArg(known)

  // Countries are resolved for all regions even with --continent, so region priority stays the same.
  const countries = await resolveCountries()
  fs.mkdirSync(path.join(OUTPUT_DIR, 'continents'), { recursive: true })
  const index = readIndex()

  for (const continent of known) {
    if (only && !only.includes(continent)) continue
    const own = countries.filter(c => c.continent === continent)
    console.log(`\n== ${continent}: ${own.length} countries`)

    const perCountry = await mapLimit(own, CONCURRENCY, async country => {
      const rows = await runQuery(buildQuery(country))
      const records = rows.map(r => toRecord(r, country)).filter(Boolean)
      await attachClubs(records)
      console.log(`${continent}/${country.key}: ${records.length} stadiums, ${records.filter(r => r.clubs.length).length} with a club`)
      return records
    })

    // A stadium with several P17 values can come back for two countries — keep the first.
    const seen = new Set()
    const stadiums = perCountry.flat().filter(s => !seen.has(s.id) && seen.add(s.id))
    stadiums.sort((a, b) => b.capacity - a.capacity)
    saveContinent(continent, stadiums, own, index)
    console.log(`== ${continent}: saved ${stadiums.length} stadiums to ${path.relative(process.cwd(), continentFile(continent))}`)
  }

  if (!only) pruneContinents(known, index)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
