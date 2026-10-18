// Fetches football stadiums from Wikidata and writes generated/stadiums.json (not tracked by git).
// Images are not downloaded — the app hotlinks Wikimedia Commons thumbnails.
//
// Usage: npm run fetch:stadiums                       — always re-fetch
//        node scripts/fetch-stadiums.mjs --if-missing — fetch only when the file is absent (predev/prebuild)
// Manual corrections (aliases, exclusions) live in src/data/stadiumsOverrides.js, not here,
// so they survive re-fetching.

import fs from 'fs'
import path from 'path'

const ENDPOINT = 'https://query.wikidata.org/sparql'
// Wikimedia User-Agent policy: identify the tool and give a contact point.
const USER_AGENT = 'football-quiz-practice/0.1 (stadium data import; https://www.wikidata.org/wiki/Wikidata:Data_access)'
const OUTPUT = path.resolve(import.meta.dirname, '../generated/stadiums.json')
const MIN_CAPACITY = 5000

// key/continent must match the labels in src/data/geoLabels.js
// nameLang    — label language used as the stadium name (the other one becomes an alias).
//               Polish labels of foreign stadiums are often stale sponsor names.
// metroAreas  — areas whose stadiums all get one city name (London stadiums sit in boroughs).
const COUNTRIES = [
  { qid: 'Q36', key: 'poland', continent: 'europe', nameLang: 'pl' },
  { qid: 'Q145', key: 'united_kingdom', continent: 'europe', nameLang: 'en', metroAreas: { Q23306: 'Londyn' } },
]

const FOOTBALL = 'Q2736'
const FOOTBALL_VENUE = 'Q1154710'
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

async function runQuery(query) {
  const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(query)}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
  })
  if (!res.ok) throw new Error(`SPARQL request failed: HTTP ${res.status}`)
  return (await res.json()).results.bindings
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
    continent: country.continent,
    capacity: Math.round(Number(row.capacity.value)),
    coord,
    ...img,
    aliases: [...aliases],
  }
}

async function main() {
  if (process.argv.includes('--if-missing') && fs.existsSync(OUTPUT)) return
  const all = []
  for (const country of COUNTRIES) {
    const rows = await runQuery(buildQuery(country))
    const records = rows.map(r => toRecord(r, country)).filter(Boolean)
    console.log(`${country.key}: ${records.length} stadiums`)
    all.push(...records)
  }
  all.sort((a, b) => b.capacity - a.capacity)
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true })
  fs.writeFileSync(OUTPUT, JSON.stringify(all, null, 2) + '\n')
  console.log(`Wrote ${all.length} stadiums to ${path.relative(process.cwd(), OUTPUT)}`)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
