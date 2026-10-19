import { useState, useEffect } from 'react'
import './QuizParts.css'

// Shared pieces of the question and summary screens.
// A round result is { ok, given, answer, hints } — `given` is '' for a skipped question.

// Tactics board (cream pitch with lines) the question image sits on.
export function PitchBoard({ children }) {
  return (
    <div className="pitch-board">
      <svg viewBox="0 0 300 400" preserveAspectRatio="none" className="pitch-lines" aria-hidden="true">
        <rect x="12" y="12" width="276" height="376" />
        <line x1="12" y1="200" x2="288" y2="200" />
        <circle cx="150" cy="200" r="40" />
        <rect x="90" y="12" width="120" height="44" />
        <rect x="90" y="344" width="120" height="44" />
      </svg>
      {children}
    </div>
  )
}

export function QuizHeader({ round, total, onBack }) {
  return (
    <div className="quiz-head">
      <button className="back-btn back-btn-sm" onClick={onBack} aria-label="Wróć">&#8249;</button>
      {total > 0 && (
        <div className="quiz-head-round">
          {String(round).padStart(2, '0')}<span>/{total}</span>
        </div>
      )}
    </div>
  )
}

// `current` is the 0-based index of the active question; omit it while loading.
export function Progress({ total, current = -1, results = [], filled = 0 }) {
  return (
    <div className="quiz-progress">
      {Array.from({ length: total }).map((_, i) => {
        const r = results[i]
        const state = r ? (r.ok ? 'ok' : 'bad') : i === current ? 'now' : i < filled ? 'ok' : ''
        return <div key={i} className={`progress-seg${state ? ` seg-${state}` : ''}`} />
      })}
    </div>
  )
}

// items: [{ k: label, v: value }]; `open` holds indexes of revealed hints.
export function Hints({ items, open, revealAll, onOpen }) {
  return (
    <div className="hints">
      <div className="hints-grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((h, i) => {
          const shown = revealAll || open.includes(i)
          return (
            <button
              key={h.k}
              className={`hint${shown ? ' hint-open' : ''}`}
              onClick={() => !shown && onOpen(i)}
              disabled={shown}
            >
              <span className="hint-k">{h.k}</span>
              <span className="hint-v">{shown ? h.v : 'Odkryj +'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Coloured frame + result card laid over the question board.
export function Feedback({ result, children }) {
  if (!result) return null
  const cls = result.ok ? 'fb-ok' : 'fb-bad'
  return (
    <>
      <div className={`fb-frame ${cls}`} />
      <div className={`fb-card ${cls}`} role="status">
        <div className="fb-icon">{result.ok ? '✓' : '✗'}</div>
        <div className="fb-text">
          <div className="fb-title">{result.ok ? 'Dobrze!' : result.given ? 'Pudło' : 'Pominięte'}</div>
          <div className="fb-detail">
            {result.ok ? result.answer : (
              <>To <b>{result.answer}</b>{result.given && <span className="fb-given"> · Twoja: <s>{result.given}</s></span>}</>
            )}
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

export function QuizQuestion({ lead, accent }) {
  return <div className="quiz-question">{lead} <em>{accent}</em></div>
}

// Text input with an autocomplete list. suggestions: [{ id, label }].
// Submitting an empty field skips the question.
export function AnswerBar({ value, onChange, suggestions, onPick, onSubmit, placeholder }) {
  const [activeIdx, setActiveIdx] = useState(-1)

  function handleKeyDown(e) {
    if (!suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Escape') onChange('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (activeIdx >= 0 && suggestions[activeIdx]) onPick(suggestions[activeIdx])
    else onSubmit()
  }

  return (
    <form className="answer-bar" onSubmit={handleSubmit}>
      <div className="answer-wrap">
        <input
          className="answer-input"
          type="text"
          autoFocus
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={e => { onChange(e.target.value); setActiveIdx(-1) }}
          onKeyDown={handleKeyDown}
        />
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                className={`suggestion-item${i === activeIdx ? ' active' : ''}`}
                onMouseDown={e => { e.preventDefault(); onPick(s) }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="submit" className="btn answer-btn">{value.trim() ? 'OK' : 'Pomiń'}</button>
    </form>
  )
}

// "Next" button; Enter anywhere on the page triggers it too.
export function NextButton({ last, onClick }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Enter') { e.preventDefault(); onClick() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClick])

  return (
    <button className="btn btn-block next-btn" onClick={onClick}>
      {last ? 'Podsumowanie ▸' : 'Dalej ▸'}
    </button>
  )
}

function verdict(ok, total) {
  const ratio = total ? ok / total : 0
  if (ratio >= 0.9) return 'Gotowy na mecz.'
  if (ratio >= 0.7) return 'Solidna odprawa.'
  if (ratio >= 0.4) return 'Jeszcze trening.'
  return 'Wracamy do taktyki.'
}

export function QuizSummary({ title, results, onAgain, onMenu }) {
  const ok = results.filter(r => r.ok).length

  return (
    <div className="screen">
      <div className="summary-top">
        <div className="lbl">{title} · Wynik</div>
        <div className="summary-score">
          <span className="summary-ok">{ok}</span>
          <span className="summary-of">/{results.length}</span>
        </div>
        <div className="summary-verdict">{verdict(ok, results.length)}</div>
      </div>

      <div className="summary-actions">
        <button className="btn btn-ghost" onClick={onMenu}>Menu</button>
        <button className="btn summary-again" onClick={onAgain}>Jeszcze raz ▸</button>
      </div>
    </div>
  )
}
