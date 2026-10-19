import { useState, useCallback, useEffect } from 'react'
import { prepareStadiumDeck, getSuggestions, checkAnswer } from '../data/stadiumUtils.js'
import { countryLabel } from '../data/geoLabels.js'
import { PitchBoard, QuizHeader, Progress, Hints, Feedback, QuizQuestion, AnswerBar, NextButton, QuizSummary } from './QuizParts.jsx'
import { useViewportLock } from '../hooks/useViewportLock.js'
import './StadiumQuiz.css'

const ROUND_SIZE = 10

// Attribution links come from generated data — only allow plain https URLs
const isSafeUrl = url => typeof url === 'string' && url.startsWith('https://')

export default function StadiumQuiz({ stadiums, onBack, onMenu }) {
  const [deck, setDeck] = useState(null) // null while photos are preloading
  const [progress, setProgress] = useState({ loaded: 0, total: Math.min(ROUND_SIZE, stadiums.length) })
  const [deckRequest, setDeckRequest] = useState(0) // bumped to prepare a fresh deck
  const [round, setRound] = useState(1)
  const [input, setInput] = useState('')
  const [openHints, setOpenHints] = useState([])
  const [result, setResult] = useState(null)
  const [results, setResults] = useState([])
  const [done, setDone] = useState(false)
  useViewportLock()

  const TOTAL = deck?.length ?? 0
  const question = deck?.[round - 1]

  useEffect(() => {
    let cancelled = false
    prepareStadiumDeck(stadiums, ROUND_SIZE, (loaded, total) => {
      if (!cancelled) setProgress({ loaded, total })
    }).then(d => { if (!cancelled) setDeck(d) })
    return () => { cancelled = true }
  }, [stadiums, deckRequest])

  const suggestions = result
    ? []
    : getSuggestions(input, stadiums).slice(0, 6).map(s => ({ id: s.id, label: [s.stadiumName, s.clubs?.[0] || s.city].filter(Boolean).join(' · '), stadium: s }))

  function finish(ok, given) {
    const r = { ok, given: given.trim(), answer: question.stadiumName, hints: openHints.length }
    setResult(r)
    setResults(rs => [...rs, r])
  }

  const handleNext = useCallback(() => {
    if (round >= TOTAL) { setDone(true); return }
    setRound(r => r + 1)
    setInput('')
    setOpenHints([])
    setResult(null)
  }, [round, TOTAL])

  function handleRestart() {
    setDeck(null)
    setProgress({ loaded: 0, total: Math.min(ROUND_SIZE, stadiums.length) })
    setDeckRequest(n => n + 1)
    setRound(1)
    setInput('')
    setOpenHints([])
    setResult(null)
    setResults([])
    setDone(false)
  }

  if (!deck || !deck.length) {
    return (
      <div className="screen">
        <QuizHeader round={0} total={0} onBack={onBack} />
        {!deck && <Progress total={progress.total} filled={progress.loaded} />}
        <div className="quiz-status">
          {!deck ? `Wczytywanie zdjęć… ${progress.loaded}/${progress.total}` : (
            <>
              Nie udało się wczytać zdjęć stadionów. Sprawdź połączenie i spróbuj ponownie.
              <button className="btn" onClick={handleRestart}>Spróbuj ponownie</button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (done) return <QuizSummary title="Stadiony" results={results} onAgain={handleRestart} onMenu={onMenu} />
  if (!question) return null

  const hints = [
    { k: 'Kraj', v: question.countryName || countryLabel(question.country) },
    question.city && { k: 'Miasto', v: question.city },
    question.clubs?.length && { k: question.clubs.length > 1 ? 'Kluby' : 'Klub', v: question.clubs.join(' · ') },
  ].filter(Boolean)

  return (
    <div className="screen">
      <QuizHeader round={round} total={TOTAL} onBack={onBack} />
      <Progress total={TOTAL} current={round - 1} results={results} />

      <div className="quiz-answer">
        <QuizQuestion lead="Jaki to" accent="stadion?" />
        {result ? (
          <NextButton last={round >= TOTAL} onClick={handleNext} />
        ) : (
          <AnswerBar
            value={input}
            onChange={setInput}
            suggestions={suggestions}
            onPick={s => finish(s.stadium.id === question.id, s.stadium.stadiumName)}
            onSubmit={() => finish(checkAnswer(input, question), input)}
            placeholder="Nazwa lub miasto…"
          />
        )}
      </div>

      <Hints items={hints} open={openHints} revealAll={!!result} onOpen={i => setOpenHints(h => [...h, i])} />

      <div className="quiz-stage">
        <PitchBoard>
          <img key={question.id} src={question.imageUrl} alt="Stadion" className="stadium-img" />
        </PitchBoard>
        <Feedback result={result}>
          {isSafeUrl(question.imageSource) && (
            <a className="photo-source" href={question.imageSource} target="_blank" rel="noopener noreferrer">
              Zdjęcie: Wikimedia Commons (autor i licencja)
            </a>
          )}
        </Feedback>
      </div>
    </div>
  )
}
