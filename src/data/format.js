// 'A, B, +3' — compact summary of a selection; `empty` when nothing is selected.
export function listLabel(names, empty, sep = ', ') {
  if (!names.length) return empty
  return names.slice(0, 2).join(sep) + (names.length > 2 ? `${sep}+${names.length - 2}` : '')
}
