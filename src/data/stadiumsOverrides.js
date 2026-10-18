// Manual corrections applied on top of generated/stadiums/ (scripts/fetch-stadiums.mjs).
// Keyed by Wikidata id, so they survive re-fetching.
//   aliases  — extra accepted answers, appended to the Wikidata ones
//   exclude  — drop the stadium from the quiz (bad photo, not really a football ground, ...)
//   any other field (stadiumName, city, image, ...) replaces the generated value
const overrides = {
  // ── Poland ──
  Q188699: { aliases: ['Inea Stadion', 'Inea', 'Bułgarska'] },   // Poznań
  Q182385: { aliases: ['Polsat'] },                               // Gdańsk

  // ── United Kingdom: current names (Wikidata label is an old sponsor name) ──
  Q500922: { stadiumName: 'bet365 Stadium', aliases: ['Britannia Stadium'] },
  Q620031: { stadiumName: 'King Power Stadium', aliases: ['Leicester City Stadium'] },
  Q494388: { stadiumName: 'Brick Community Stadium', aliases: ['DW Stadium'] },
  Q619407: { stadiumName: 'Accu Stadium', city: 'Huddersfield', aliases: ['Kirklees Stadium'] },

  // ── United Kingdom: city is a district/borough in Wikidata ──
  Q83457: { city: 'Manchester' },          // Old Trafford
  Q642557: { city: 'Sheffield' },          // Hillsborough
  Q593446: { city: 'Nottingham' },         // City Ground
  Q242772: { city: 'Bolton' },             // Toughsheet Community Stadium
  Q969279: { city: 'Bradford' },           // Valley Parade
  Q1202579: { city: 'Wrexham' },           // Racecourse Ground
  Q1724993: { city: 'Stoke-on-Trent' },    // Vale Park
  Q54817852: { city: 'Salford' },          // Moor Lane

  // ── United Kingdom: no longer exist / duplicates / outside the UK proper ──
  Q1016749: { exclude: true },   // Burnden Park — demolished 1999
  Q5053042: { exclude: true },   // Cathkin Park — derelict
  Q6123601: { exclude: true },   // Northumberland Development Project — duplicate of Tottenham Hotspur Stadium
  Q1546623: { exclude: true },   // Griffin Park — demolished
  Q503775: { exclude: true },    // Love Street — demolished
  Q2448476: { exclude: true },   // North Road — gone since 1893
  Q2894736: { exclude: true },   // Belle Vue (Doncaster) — demolished
  Q743828: { exclude: true },    // Fallowfield Stadium — demolished
  Q1579655: { exclude: true },   // Victoria Stadium — Gibraltar
}

export function getOverride(id) {
  return overrides[id] || null
}
