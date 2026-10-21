// Interface language: the user's saved choice, otherwise the browser's (Polish for pl-*, English for the rest).
// Messages live in pl.js / en.js as flat keys; a value is either a string with {placeholders}
// or a plural object keyed by Intl.PluralRules categories ({ one, few, many } in Polish, { one, other } in English).
import { useSyncExternalStore } from 'react'
import pl from './pl.js'
import en from './en.js'

const MESSAGES = { pl, en }
const LOCALES = { pl: 'pl-PL', en: 'en-GB' }
const STORAGE_KEY = 'lang'

let lang = 'pl'
const listeners = new Set()
const pluralRules = {}

// Storage can be unavailable (private mode, blocked site data) — the language then just isn't remembered
function readSaved() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v in MESSAGES ? v : null
  } catch (e) {
    console.warn('Language preference unavailable:', e)
    return null
  }
}

function detect() {
  const preferred = (navigator.languages?.[0] || navigator.language || '').toLowerCase()
  return preferred.startsWith('pl') ? 'pl' : 'en'
}

function apply(next) {
  lang = next
  document.documentElement.lang = next
  document.title = t('app.title')
  listeners.forEach(listener => listener())
}

export function initLang() {
  apply(readSaved() ?? detect())
}

export function setLang(next) {
  if (!(next in MESSAGES)) return
  apply(next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch (e) {
    console.warn('Language preference not saved:', e)
  }
}

export function getLang() {
  return lang
}

// BCP 47 locale for Intl APIs (number formatting, sorting)
export function getLocale() {
  return LOCALES[lang]
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Re-renders the calling component when the language changes. App uses it, so the whole tree follows.
export function useLang() {
  return useSyncExternalStore(subscribe, getLang)
}

// Missing English keys fall back to Polish, so an untranslated message is never blank
function lookup(key) {
  return MESSAGES[lang][key] ?? MESSAGES.pl[key]
}

export function hasMessage(key) {
  return lookup(key) !== undefined
}

function pluralForm(forms, count) {
  pluralRules[lang] ??= new Intl.PluralRules(LOCALES[lang])
  return forms[pluralRules[lang].select(count)] ?? forms.other ?? forms.many
}

// t('kits.seasonCount', { count: 3 }) → '3 sezony' / '3 seasons'
export function t(key, vars = {}) {
  let msg = lookup(key)
  if (msg === undefined) {
    console.warn(`Missing message: ${key}`)
    return key
  }
  if (typeof msg === 'object') msg = pluralForm(msg, vars.count)
  return msg.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
}
