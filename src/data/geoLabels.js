import { t, hasMessage } from '../i18n/index.js'

// Keys without a translation (e.g. a continent or country added to the data later) are shown humanized
function humanize(key) {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
}

export function continentLabel(c) {
  return hasMessage(`continent.${c}`) ? t(`continent.${c}`) : humanize(c)
}

export function countryLabel(c) {
  return hasMessage(`country.${c}`) ? t(`country.${c}`) : humanize(c)
}
