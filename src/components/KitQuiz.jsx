import { useState, useCallback, useRef, useEffect } from 'react'
import { generateQuestion, getSuggestions, checkAnswer } from '../data/kitUtils.js'
import './KitQuiz.css'

const TOTAL = 10

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
  const inputRef = useRef(null)

  // dedupe suggestions by club id (same club can appear in multiple leagues)
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
  }, [usedKeys, clubs, kitTypes])

  if (done) {
    return (
      <div className="quiz-done">
        <div className="done-icon">{score >= 8 ? '🏆' : score >= 5 ? '⚽' : '📚'}</div>
        <h2>Koniec rundy!</h2>
        <div className="done-score">
          <span className="score-big">{score}</span>
          <span className="score-of">/ {TOTAL}</span>
        </div>
        <p className="done-msg">
          {score >= 8 ? 'Świetny wynik! Znasz koszulki bardzo dobrze.' :
           score >= 5 ? 'Nieźle! Jeszcze trochę treningu i będzie idealnie.' :
           'Trzeba potrenować — koszulki czekają!'}
        </p>
        <div className="done-btns">
          <button className="btn-secondary" onClick={onBack}>Zmień wybór</button>
          <button className="btn-primary" onClick={handleRestart}>Zagraj jeszcze raz</button>
        </div>
      </div>
    )
  }

  if (!question) return null

  return (
    <div className="kit-quiz">
      <div className="quiz-meta">
        <span className="league-badge">{question.club.league} · {question.club.season.replace('_', '/')}</span>
        <span className="progress-text">{round} / {TOTAL}</span>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${((round - 1) / TOTAL) * 100}%` }} />
      </div>

      <div className="score-row">
        <span className="score-label">Punkty</span>
        <span className="score-value">{score}</span>
      </div>

      <div className="kit-card">
        <div className="kit-type-badge">{question.kitLabel}</div>
        <div className="kit-image-wrapper">
          <img
            key={question.key}
            src={question.imageUrl}
            alt="Koszulka — zgadnij klub"
            className="kit-image"
          />
          {!result && <div className="logo-cover">?</div>}
        </div>
      </div>

      <p className="question-prompt">Jakiego klubu to koszulka?</p>

      <div className="answer-area">
        <div className="input-wrap">
          <input
            ref={inputRef}
            className={`answer-input${result ? (result.correct ? ' input-correct' : ' input-wrong') : ''}`}
            type="text"
            placeholder="Wpisz nazwę klubu…"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={!!result}
            autoComplete="off"
          />
          {!result && (
            <button className="submit-btn" onClick={() => submit(null)} disabled={input.trim().length < 2}>
              OK
            </button>
          )}
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
