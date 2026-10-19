import { useState, useCallback, useEffect } from 'react'
import { prepareKitDeck, getSuggestions, checkAnswer, leagueName } from '../data/kitUtils.js'
import { PitchBoard, QuizHeader, Progress, Hints, Feedback, QuizQuestion, AnswerBar, NextButton, QuizSummary } from './QuizParts.jsx'
import { useViewportLock } from '../hooks/useViewportLock.js'
import './KitQuiz.css'

const ROUND_SIZE = 10

function hintsFor(question) {
  const { club, kitLabel } = question
  const [from, to] = club.season.split('_')
  return [
    { k: 'Sezon', v: `${from}/${to}` },
    club.kind === 'nation' ? { k: 'Konfederacja', v: club.league } : { k: 'Liga', v: leagueName(club.league) },
    { k: 'Rodzaj', v: kitLabel.charAt(0).toUpperCase() + kitLabel.slice(1) },
  ]
}

export default function KitQuiz({ clubs, kind = 'club', kitTypes = [1, 2, 3], onBack, onMenu }) {
  const isNation = kind === 'nation'
  const [deck, setDeck] = useState(null) // null while kit images are preloading
  const [progress, setProgress] = useState({ loaded: 0, total: ROUND_SIZE })
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

  // The whole round is downloaded before the first question, so "Dalej" never waits for an image
  useEffect(() => {
    let cancelled = false
    prepareKitDeck(clubs, kitTypes, ROUND_SIZE, (loaded, total) => {
      if (!cancelled) setProgress({ loaded, total })
    }).then(d => { if (!cancelled) setDeck(d) })
    return () => { cancelled = true }
  }, [clubs, kitTypes, deckRequest])

  const suggestions = result ? [] : getSuggestions(input, clubs).slice(0, 6).map(c => ({ id: c.id, label: c.name, club: c }))

  function finish(ok, given) {
    const r = { ok, given: given.trim(), answer: question.club.name, hints: openHints.length }
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
    setProgress({ loaded: 0, total: ROUND_SIZE })
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
          {!deck ? `Wczytywanie koszulek… ${progress.loaded}/${progress.total}` : (
            <>
              Nie udało się wczytać koszulek. Sprawdź połączenie i spróbuj ponownie.
              <button className="btn" onClick={handleRestart}>Spróbuj ponownie</button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (done) return <QuizSummary title="Koszulki" results={results} onAgain={handleRestart} onMenu={onMenu} />
  if (!question) return null

  return (
    <div className="screen screen-quiz">
      <QuizHeader round={round} total={TOTAL} onBack={onBack} />
      <Progress total={TOTAL} current={round - 1} results={results} />

      <div className="quiz-answer">
        <QuizQuestion lead={isNation ? 'Jakiej reprezentacji' : 'Jakiego klubu'} accent="to koszulka?" />
        {result ? (
          <NextButton last={round >= TOTAL} onClick={handleNext} />
        ) : (
          <AnswerBar
            value={input}
            onChange={setInput}
            suggestions={suggestions}
            onPick={s => finish(s.club.id === question.club.id, s.label)}
            onSubmit={() => finish(checkAnswer(input, question.club), input)}
            placeholder={isNation ? 'Wpisz reprezentację…' : 'Wpisz klub…'}
          />
        )}
      </div>

      <Hints items={hintsFor(question)} open={openHints} revealAll={!!result} onOpen={i => setOpenHints(h => [...h, i])} />

      <div className="quiz-stage">
        <PitchBoard>
          <div className="jersey-frame">
            <img key={question.key} src={question.imageUrl} alt="Koszulka" className="jersey-img" />
            {!result && <div className="logo-mask">?</div>}
          </div>
        </PitchBoard>
        <Feedback result={result} />
      </div>
    </div>
  )
}
