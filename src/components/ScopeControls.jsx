import { useState, useEffect } from 'react'
import { t, getLocale } from '../i18n/index.js'
import './ScopeControls.css'

// Building blocks of the "Zakres briefa" screens: summary rows on the screen,
// long lists live in a bottom sheet.

export function ScopeHeader({ kicker, title, onBack }) {
  return (
    <div className="scope-head">
      <button className="back-btn" onClick={onBack} aria-label={t('common.back')}>&#8249;</button>
      <div>
        <div className="lbl">{kicker}</div>
        <div className="scope-head-title">{title}</div>
      </div>
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      <div className="field-head">
        <span className="lbl">{label}</span>
        {hint && <span className="lbl lbl-accent2">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

// Segmented multi-toggle; items: [[id, label]]
export function ToggleGrid({ items, sel, onToggle, cols = items.length }) {
  return (
    <div className="toggle-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {items.map(([id, label], i) => (
        <button
          key={id}
          className={`toggle-cell${sel.includes(id) ? ' toggle-on' : ''}${i % cols ? ' toggle-left' : ''}${i >= cols ? ' toggle-top' : ''}`}
          onClick={() => onToggle(id)}
          aria-pressed={sel.includes(id)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Pick({ value, sub, onClick }) {
  return (
    <button className="pick" onClick={onClick}>
      <span className="pick-text">
        <span className="pick-value">{value}</span>
        {sub && <span className="pick-sub">{sub}</span>}
      </span>
      <span className="pick-action">{t('common.change')}</span>
    </button>
  )
}

export function StartBar({ count, unit, onStart, disabled, busyLabel }) {
  return (
    <div className="start-bar">
      <div className="start-count">
        <div className={`start-num${count ? '' : ' start-num-empty'}`}>{count.toLocaleString(getLocale())}</div>
        <div className="lbl lbl-sm">{unit}</div>
      </div>
      <button className="btn" onClick={onStart} disabled={disabled || !count}>
        {busyLabel || t('common.start')}
      </button>
    </div>
  )
}

// Bottom sheet with a searchable checklist; items: [{ id, label, sub?, group? }]
// `groups` splits the list into sections by item.group (default: first letter of the label).
export function Sheet({ open, title, items, sel, setSel, search, groups, onClose }) {
  const [query, setQuery] = useState('')

  // Start every opening with an empty search box
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const q = normalize(query)
  const visible = items.filter(it => !q || normalize(it.label).includes(q))
  const allSelected = items.length > 0 && items.every(it => sel.includes(it.id))
  const toggle = id => setSel(sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id])

  const row = it => {
    const on = sel.includes(it.id)
    return (
      <button key={it.id} className={`sheet-row${on ? ' sheet-row-on' : ''}`} onClick={() => toggle(it.id)} aria-pressed={on}>
        <span className="check">{on ? '✓' : ''}</span>
        <span className="sheet-row-label">{it.label}</span>
        {it.sub && <span className="sheet-row-sub">{it.sub}</span>}
      </button>
    )
  }

  let body
  if (groups) {
    const groupOf = it => it.group ?? it.label[0]
    const names = [...new Set(visible.map(groupOf))]
    body = names.map(g => (
      <div key={g}>
        <div className="lbl lbl-accent2 sheet-letter">{g}</div>
        {visible.filter(it => groupOf(it) === g).map(row)}
      </div>
    ))
  } else {
    body = visible.map(row)
  }

  return (
    <div className={`sheet${open ? ' sheet-open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button className="sheet-all lbl lbl-accent" onClick={() => setSel(allSelected ? [] : items.map(i => i.id))}>
            {t(allSelected ? 'common.deselectAll' : 'common.selectAll')}
          </button>
        </div>
        {search && (
          <label className="sheet-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
            </svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={search} />
          </label>
        )}
        <div className="sheet-list">{body}</div>
        <div className="sheet-foot">
          <button className="btn btn-block" onClick={onClose}>{t('common.done', { count: sel.length })}</button>
        </div>
      </div>
    </div>
  )
}

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
}
