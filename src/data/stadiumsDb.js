const db = {
  // Poland
  inea_stadion_poznan: {
    stadiumName: 'Inea Stadion',
    city: 'Poznań',
    aliases: ['Inea', 'Poznan', 'Poznań'],
  },
  polsat_plus_arena_gdansk: {
    stadiumName: 'Polsat Plus Arena Gdańsk',
    city: 'Gdańsk',
    aliases: ['Polsat Plus Arena', 'Polsat', 'Gdansk', 'Gdańsk'],
  },
}

export function getStadium(id) {
  return db[id] || null
}
