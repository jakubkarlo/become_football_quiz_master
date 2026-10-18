const CONTINENT_LABELS = {
  europe: 'Europa',
  south_america: 'Ameryka Płd.',
  north_america: 'Ameryka Płn.',
  central_america: 'Ameryka Śr.',
  africa: 'Afryka',
  asia: 'Azja',
  oceania: 'Oceania',
}

const COUNTRY_LABELS = {
  poland: 'Polska',
  england: 'Anglia',
  united_kingdom: 'Wielka Brytania',
  spain: 'Hiszpania',
  germany: 'Niemcy',
  italy: 'Włochy',
  france: 'Francja',
  portugal: 'Portugalia',
  netherlands: 'Holandia',
  belgium: 'Belgia',
  scotland: 'Szkocja',
  brazil: 'Brazylia',
  argentina: 'Argentyna',
  usa: 'USA',
  mexico: 'Meksyk',
  russia: 'Rosja',
  turkey: 'Turcja',
  greece: 'Grecja',
  ukraine: 'Ukraina',
  croatia: 'Chorwacja',
  serbia: 'Serbia',
  czech_republic: 'Czechy',
  hungary: 'Węgry',
  romania: 'Rumunia',
  austria: 'Austria',
  switzerland: 'Szwajcaria',
  denmark: 'Dania',
  sweden: 'Szwecja',
  norway: 'Norwegia',
  japan: 'Japonia',
  china: 'Chiny',
  south_korea: 'Korea Płd.',
  australia: 'Australia',
  south_africa: 'RPA',
  egypt: 'Egipt',
  morocco: 'Maroko',
  nigeria: 'Nigeria',
}

export function continentLabel(c) {
  return CONTINENT_LABELS[c] || c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' ')
}

export function countryLabel(c) {
  return COUNTRY_LABELS[c] || c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' ')
}
