import { useState } from 'react'
import Menu from './components/Menu'
import KitSettings from './components/KitSettings'
import KitQuiz from './components/KitQuiz'
import StadiumSettings from './components/StadiumSettings'
import StadiumQuiz from './components/StadiumQuiz'
import './App.css'

export default function App() {
  const [screen, setScreen] = useState('menu')
  const [quizClubs, setQuizClubs] = useState([])
  const [quizKitTypes, setQuizKitTypes] = useState([1, 2, 3, 'alt'])
  const [quizStadiums, setQuizStadiums] = useState([])

  function startKitQuiz(clubs, kitTypes) {
    setQuizClubs(clubs)
    setQuizKitTypes(kitTypes)
    setScreen('kit-quiz')
  }

  function handleMenuSelect(id) {
    if (id === 'kit-quiz') setScreen('kit-settings')
    else if (id === 'stadium-quiz') setScreen('stadium-settings')
  }

  return (
    <div className="app">
      {screen === 'menu'             && <Menu onSelect={handleMenuSelect} />}
      {screen === 'kit-settings'     && <KitSettings onStart={startKitQuiz} onBack={() => setScreen('menu')} />}
      {screen === 'kit-quiz'         && <KitQuiz clubs={quizClubs} kitTypes={quizKitTypes} onBack={() => setScreen('kit-settings')} />}
      {screen === 'stadium-settings' && <StadiumSettings onStart={s => { setQuizStadiums(s); setScreen('stadium-quiz') }} onBack={() => setScreen('menu')} />}
      {screen === 'stadium-quiz'     && <StadiumQuiz stadiums={quizStadiums} onBack={() => setScreen('stadium-settings')} />}
    </div>
  )
}
