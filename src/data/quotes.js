// Quotes shown at the bottom of the menu — one is drawn at random each time the menu opens.
// `author` is optional; without it the quote is shown without a caption.
export const QUOTES = [
  { text: 'To jest młoda Hiszpania, fajna Hiszpania, ale to nie jest Hiszpania, która jest tak doświadczona, jak te poprzednie Hiszpanie.' },
  { text: 'Najpierw piję kawę. Potrzebuję jej rano. Później przypominam sobie, że nienawidzę Legii.' },
  { text: 'Stwarzaliśmy sytuacje, ale ci którzy je mieli, zesrali się, nasmrodzili, a na boisku pozostawiali placki jak krowy na pastwisku' },
  { text: 'Delikatnie poprawię swoją wcześniejszą wypowiedź. Będą sami rodowici Polacy i jeden Arboleda.' },
  { text: 'A to my mamy reprezentację?' },
  { text: 'Nasza reprezentacja gra bosko – Bóg jeden wie, jak zagra.' },
]

let lastIndex = -1

// Never repeats the previous quote back to back (when there is more than one to choose from)
export function randomQuote() {
  if (QUOTES.length === 0) return null
  let index = Math.floor(Math.random() * QUOTES.length)
  if (QUOTES.length > 1 && index === lastIndex) index = (index + 1) % QUOTES.length
  lastIndex = index
  return QUOTES[index]
}
