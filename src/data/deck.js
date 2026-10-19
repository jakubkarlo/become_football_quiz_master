// Preparing a round up front: every question's image is downloaded before the first question shows,
// so moving to the next question never waits for the network.

const IMAGE_TIMEOUT_MS = 15000

export function shuffle(items) {
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
      console.warn(`Image timed out: ${url}`)
      img.src = ''
      resolve(false)
    }, IMAGE_TIMEOUT_MS)
    img.onload = () => { clearTimeout(timer); resolve(true) }
    img.onerror = () => {
      clearTimeout(timer)
      console.warn(`Image failed to load: ${url}`)
      resolve(false)
    }
    img.src = url
  })
}

// Takes items (each with `imageUrl`) in the given order and preloads `size` of them in parallel.
// An item whose image fails is replaced by the next one, so the deck comes back shorter than `size`
// only when the items run out.
export async function prepareDeck(items, size, onProgress = () => {}) {
  const target = Math.min(size, items.length)
  const deck = []
  let next = 0

  async function worker() {
    while (deck.length < target && next < items.length) {
      const item = items[next++]
      if (await preloadImage(item.imageUrl) && deck.length < target) {
        deck.push(item)
        onProgress(deck.length, target)
      }
    }
  }

  await Promise.all(Array.from({ length: target }, worker))
  return deck
}
