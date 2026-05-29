import { useState, useCallback, useRef, useEffect } from 'react'
import { generateQuestion, getSuggestions, checkAnswer } from '../data/kitUtils.js'
import './KitQuiz.css'

const TOTAL = 10

function PitchGrid() {
  return (
    <svg viewBox="0 0 300 540" preserveAspectRatio="none" className="pitch-grid" aria-hidden="true">npm
      <rect x="14" y="20" width="272" height="500" fill="none" stroke="var(--ink)" strokeWidth="1" strokeOpacity="0.2" />
      <line x1="14" y1="270" x2="286" y2="270" stroke="var(--ink)" strokeWidth="1" strokeOpacity="0.2" />
      <circle cx="150" cy="270" r="44" fill="none" stroke="var(--ink)" strokeWidth="1" strokeOpacity="0.2" />
      <circle cx="150" cy="270" r="2" fill="var(--ink)" fillOpacity="0.2" />
      <rect x="80" y="20" width="140" height="60" fill="none" stroke="var(--ink)" strokeWidth="1" strokeOpacity="0.2" />
      <rect x="80" y="460" width="140" height="60" fill="none" stroke="var(--ink)" strokeWidth="1" strokeOpacity="0.2" />
    </svg>
  )
}

export default function KitQuiz({ clubs, kitTypes = [1, 2, 3], onBack }) {
  const [usedKeys] = useState(() => new Set())
  const [question, setQuestion] = useState(() => generateQuestion(clubs, new Set(), kitTypes))
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const [result, setResult] = useState(null)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [done, setDone] = useState(false)
  const [leagueVisible, setLeagueVisible] = useState(false)
  const [kitTypeVisible, setKitTypeVisible] = useState(false)
  const inputRef = useRef(null)

  const uniqueSuggestions = suggestions.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i)

  useEffect(() => {
    if (!result) inputRef.current?.focus()
  }, [question, result])

  const handleInput = (e) => {
    const val = e.target.value
    setInput(val)
    setSuggestions(getSuggestions(val, clubs))
    setActiveIdx(-1)
  }

  const submit = useCallback((pickedClub) => {
    if (result) return
    const correct = pickedClub
      ? pickedClub.id === question.club.id
      : checkAnswer(input, question.club)
    setResult({ correct })
    setSuggestions([])
    if (correct) setScore(s => s + 1)
  }, [result, input, question])

  const handleKeyDown = (e) => {
    if (uniqueSuggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, uniqueSuggestions.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); return }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIdx >= 0) { setInput(uniqueSuggestions[activeIdx].name); submit(uniqueSuggestions[activeIdx]) }
        else submit(null)
        return
      }
    } else if (e.key === 'Enter') {
      submit(null)
    }
    if (e.key === 'Escape') setSuggestions([])
  }

  const handleNext = useCallback(() => {
    if (round >= TOTAL) { setDone(true); return }
    usedKeys.add(question.key)
    const next = generateQuestion(clubs, usedKeys, kitTypes) || generateQuestion(clubs, new Set(), kitTypes)
    setQuestion(next)
    setInput('')
    setSuggestions([])
    setActiveIdx(-1)
    setResult(null)
    setRound(r => r + 1)
    setLeagueVisible(false)
    setKitTypeVisible(false)
  }, [round, question, usedKeys, clubs, kitTypes])

  const handleRestart = useCallback(() => {
    usedKeys.clear()
    setQuestion(generateQuestion(clubs, new Set(), kitTypes))
    setInput('')
    setSuggestions([])
    setActiveIdx(-1)
    setResult(null)
    setScore(0)
    setRound(1)
    setDone(false)
    setLeagueVisible(false)
    setKitTypeVisible(false)
  }, [usedKeys, clubs, kitTypes])

  if (done) {
    return (
      <div className="quiz-done">
        <div className="quiz-header">
          <button className="header-back" onClick={onBack}>&#8249;</button>
          <span className="header-label">WYNIK BRIEFA</span>
        </div>
        <div className="done-body">
          <div className="done-score-block">
            <div className="done-score-sublabel">PUNKTY</div>
            <div className="done-score-val">
              {score}<span className="done-score-of">/{TOTAL}</span>
            </div>
          </div>
          <p className="done-msg">
            {score >= 8 ? 'Świetny wynik! Znasz koszulki bardzo dobrze.' :
             score >= 5 ? 'Nieźle! Jeszcze trochę treningu i będzie idealnie.' :
             'Trzeba potrenować — koszulki czekają!'}
          </p>
          <div className="done-btns">
            <button className="btn-secondary" onClick={onBack}>Zmień zakres</button>
            <button className="btn-primary" onClick={handleRestart}>Zagraj jeszcze raz</button>
          </div>
        </div>
      </div>
    )
  }

  if (!question) return null

  const leagueText = `${question.club.league} · ${question.club.season.replace('_', '/')}`
  const kitLabel = question.kitLabel || 'Koszulka'

  return (
    <div className="kit-quiz">
      <div className="quiz-header">
        <button className="header-back" onClick={onBack}>&#8249;</button>
        <div className="header-center">
          {(leagueVisible || result)
            ? <span className="hint-pill">{leagueText}</span>
            : <button className="hint-btn" onClick={() => setLeagueVisible(true)}>Pokaż ligę</button>
          }
        </div>
        <div className="header-right">
          <div className="header-round">
            {String(round).padStart(2, '0')}<span className="header-round-of">/{TOTAL}</span>
          </div>
        </div>
      </div>

      <div className="quiz-progress">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} className={`progress-seg${i < round ? ' seg-done' : ''}`} />
        ))}
      </div>

      <div className="quiz-board">
        <PitchGrid />
        <div className="board-corner-labels">
          {(kitTypeVisible || result)
            ? <span className="hint-pill">{kitLabel}</span>
            : <button className="hint-btn" onClick={() => setKitTypeVisible(true)}>Pokaż wariant</button>
          }
        </div>

        <div className="board-center">
          <div className="jersey-frame">
            <div className="bracket tl" />
            <div className="bracket tr" />
            <div className="bracket bl" />
            <div className="bracket br" />
            <img
              key={question.key}
              src={question.imageUrl}
              alt="Koszulka"
              className="jersey-img"
            />
            {!result && <div className="logo-mask">?</div>}
          </div>
        </div>
      </div>

      <div className="quiz-answer">


        <div className="input-row">
          <div className="input-wrap">
            <input
              ref={inputRef}
              className={`answer-input${result ? (result.correct ? ' input-correct' : ' input-wrong') : ''}`}
              type="text"
              placeholder="Wpisz klub…"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={!!result}
              autoComplete="off"
            />
            {uniqueSuggestions.length > 0 && !result && (
              <ul className="suggestions">
                {uniqueSuggestions.map((club, i) => (
                  <li
                    key={club.id}
                    className={`suggestion-item${i === activeIdx ? ' active' : ''}`}
                    onMouseDown={() => { setInput(club.name); submit(club) }}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    {club.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {!result && (
            <button className="submit-btn" onClick={() => submit(null)} disabled={input.trim().length < 2}>
              OK
            </button>
          )}
        </div>

        {result && (
          <div className={`feedback${result.correct ? ' feedback-correct' : ' feedback-wrong'}`}>
            {result.correct
              ? `Dobrze! To ${question.club.name}`
              : `Błąd — to była koszulka ${question.club.name}`}
          </div>
        )}

        {result && (
          <button className="btn-primary next-btn" onClick={handleNext}>
            {round < TOTAL ? 'Następna →' : 'Zobacz wynik →'}
          </button>
        )}
      </div>
    </div>
  )
}
