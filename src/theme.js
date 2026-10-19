// Colour theme: the user's saved choice, dark by default.
// Applied as data-theme on <html>; the palettes live in index.css.

const STORAGE_KEY = 'theme'
// Browser bar colour per theme — keep in sync with --bg in index.css
const THEME_COLOR = { dark: '#5c4168', light: '#F3E9E2' }

// Storage can be unavailable (private mode, blocked site data) — the theme then just isn't remembered
function readSaved() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch (e) {
    console.warn('Theme preference unavailable:', e)
    return null
  }
}

function apply(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
}

export function currentTheme() {
  return document.documentElement.dataset.theme
}

export function initTheme() {
  apply(readSaved() ?? 'dark')
}

export function setTheme(theme) {
  apply(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch (e) {
    console.warn('Theme preference not saved:', e)
  }
}
