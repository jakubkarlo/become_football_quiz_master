import { useState, useCallback, useRef, useEffect } from 'react'
import { prepareStadiumDeck, getSuggestions, checkAnswer } from '../data/stadiumUtils.js'
import { continentLabel, countryLabel } from '../data/geoLabels.js'
import './KitQuiz.css'
import './StadiumQuiz.css'

const ROUND_SIZE = 10

export default function StadiumQuiz({ stadiums, onBack }) {
  const [deck, setDeck] = useState(null) // null while photos are preloading
  const [progress, setProgress] = useState({ loaded: 0, total: Math.min(ROUND_SIZE, stadiums.length) })
  const [deckRequest, setDeckRequest] = useState(0) // bumped to prepare a fresh deck
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [activeIdx, setActiveIdx] = useState(-1)
  const [result, setResult] = useState(null)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [done, setDone] = useState(false)
  const [continentVisible, setContinentVisible] = useState(false)
  const [countryVisible, setCountryVisible] = useState(false)
  const inputRef = useRef(null)

  const TOTAL = deck?.length ?? 0
  const question = deck?.[round - 1]

  useEffect(() => {
    let cancelled = false
    prepareStadiumDeck(stadiums, ROUND_SIZE, (loaded, total) => {
      if (!cancelled) setProgress({ loaded, total })
    }).then(d => { if (!cancelled) setDeck(d) })
    return () => { cancelled = true }
  }, [stadiums, deckRequest])

  const uniqueSuggestions = suggestions.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)

  useEffect(() => {
    if (!result) inputRef.current?.focus()
  }, [question, result])

  const handleInput = (e) => {
    const val = e.target.value
    setInput(val)
    setSuggestions(getSuggestions(val, stadiums))
    setActiveIdx(-1)
  }

  const submit = useCallback((picked) => {
    if (result) return
    const correct = picked ? picked.id === question.id : checkAnswer(input, question)
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
        if (activeIdx >= 0) { setInput(uniqueSuggestions[activeIdx].stadiumName); submit(uniqueSuggestions[activeIdx]) }
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
    setInput('')
    setSuggestions([])
    setActiveIdx(-1)
    setResult(null)
    setRound(r => r + 1)
    setContinentVisible(false)
    setCountryVisible(false)
  }, [round, TOTAL])

  const handleRestart = useCallback(() => {
    setDeck(null)
    setProgress({ loaded: 0, total: Math.min(ROUND_SIZE, stadiums.length) })
    setDeckRequest(n => n + 1)
    setInput('')
    setSuggestions([])
    setActiveIdx(-1)
    setResult(null)
    setScore(0)
    setRound(1)
    setDone(false)
    setContinentVisible(false)
    setCountryVisible(false)
  }, [stadiums])

  if (!deck) {
    return (
      <div className="stadium-quiz">
        <div className="quiz-header">
          <button className="header-back" onClick={onBack}>&#8249;</button>
          <span className="header-label">PRZYGOTOWANIE BRIEFA</span>
        </div>
        <div className="quiz-progress">
          {Array.from({ length: progress.total }).map((_, i) => (
            <div key={i} className={`progress-seg${i < progress.loaded ? ' seg-done' : ''}`} />
          ))}
        </div>
        <div className="deck-loading">
          Wczytywanie zdjęć… {progress.loaded}/{progress.total}
        </div>
      </div>
    )
  }

  if (!deck.length) {
    return (
      <div className="stadium-quiz">
        <div className="quiz-header">
          <button className="header-back" onClick={onBack}>&#8249;</button>
          <span className="header-label">PRZYGOTOWANIE BRIEFA</span>
        </div>
        <div className="deck-loading">
          Nie udało się wczytać zdjęć stadionów. Sprawdź połączenie i spróbuj ponownie.
          <button className="btn-primary" onClick={handleRestart}>Spróbuj ponownie</button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="stadium-quiz quiz-done">
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
            {score >= 8 ? 'Świetny wynik! Znasz stadiony bardzo dobrze.' :
             score >= 5 ? 'Nieźle! Jeszcze trochę treningu i będzie idealnie.' :
             'Trzeba potrenować — stadiony czekają!'}
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

  return (
    <div className="stadium-quiz">
      <div className="quiz-header">
        <button className="header-back" onClick={onBack}>&#8249;</button>
        <div className="header-center">
          {(countryVisible || result)
            ? <span className="hint-pill">{question.countryName || countryLabel(question.country)}</span>
            : <button className="hint-btn" onClick={() => setCountryVisible(true)}>Pokaż kraj</button>
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

      <div className="quiz-stadium-board">
        <div className="board-corner-labels">
          {(continentVisible || result)
            ? <span className="hint-pill">{continentLabel(question.continent)}</span>
            : <button className="hint-btn" onClick={() => setContinentVisible(true)}>Pokaż kontynent</button>
          }
        </div>
        <img
          key={question.id}
          src={question.imageUrl}
          alt="Stadion"
          className="stadium-img"
        />
      </div>

      <div className="quiz-answer">
        <div className="quiz-question">
          Jaki to<br />
          <em>stadion?</em>
        </div>

        <div className="input-row">
          <div className="input-wrap">
            <input
              ref={inputRef}
              className={`answer-input${result ? (result.correct ? ' input-correct' : ' input-wrong') : ''}`}
              type="text"
              placeholder="Nazwa lub miasto…"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={!!result}
              autoComplete="off"
            />
            {uniqueSuggestions.length > 0 && !result && (
              <ul className="suggestions">
                {uniqueSuggestions.map((s, i) => (
                  <li
                    key={s.id}
                    className={`suggestion-item${i === activeIdx ? ' active' : ''}`}
                    onMouseDown={() => { setInput(s.stadiumName); submit(s) }}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    {s.stadiumName} · {s.city}
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
              ? `Dobrze! To ${question.stadiumName}, ${question.city}`
              : `Błąd — to był ${question.stadiumName}, ${question.city}`}
          </div>
        )}

        {result && question.imageSource && (
          <a className="photo-source" href={question.imageSource} target="_blank" rel="noopener noreferrer">
            Zdjęcie: Wikimedia Commons (autor i licencja)
          </a>
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
