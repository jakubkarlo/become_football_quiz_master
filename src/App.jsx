import { useState } from 'react'
import Menu from './components/Menu'
import KitSettings from './components/KitSettings'
import KitQuiz from './components/KitQuiz'
import './App.css'

export default function App() {
  const [screen, setScreen] = useState('menu')
  const [quizClubs, setQuizClubs] = useState([])
  const [quizKitTypes, setQuizKitTypes] = useState([1, 2, 3, 'alt'])

  function startKitQuiz(clubs, kitTypes) {
    setQuizClubs(clubs)
    setQuizKitTypes(kitTypes)
    setScreen('kit-quiz')
  }

  const showBack = screen !== 'menu'
  const backTarget = screen === 'kit-quiz' ? 'kit-settings' : 'menu'

  return (
    <div className="app">
      <header className="app-header">
        <div className="dot" />
        <h1>Football IQ</h1>
        {showBack && (
          <button className="back-btn" onClick={() => setScreen(backTarget)}>
            ← {backTarget === 'menu' ? 'Menu' : 'Ustawienia'}
          </button>
        )}
      </header>
      <main className="app-main">
        {screen === 'menu'         && <Menu onSelect={s => setScreen(s === 'kit-quiz' ? 'kit-settings' : s)} />}
        {screen === 'kit-settings' && <KitSettings onStart={startKitQuiz} />}
        {screen === 'kit-quiz'     && <KitQuiz clubs={quizClubs} kitTypes={quizKitTypes} onBack={() => setScreen('kit-settings')} />}
      </main>
    </div>
  )
}
