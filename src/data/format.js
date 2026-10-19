// Polish plural form: plural(5, 'sezon', 'sezony', 'sezonów') → 'sezonów'
export function plural(n, one, few, many) {
  if (n === 1) return one
  const tens = n % 100
  const units = n % 10
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many
}

// 'A, B, +3' — compact summary of a selection; `empty` when nothing is selected.
export function listLabel(names, empty, sep = ', ') {
  if (!names.length) return empty
  return names.slice(0, 2).join(sep) + (names.length > 2 ? `${sep}+${names.length - 2}` : '')
}
