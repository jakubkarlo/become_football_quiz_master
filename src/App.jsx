import { useState } from 'react'
import Menu from './components/Menu'
import KitSettings from './components/KitSettings'
import KitQuiz from './components/KitQuiz'
import StadiumSettings from './components/StadiumSettings'
import StadiumQuiz from './components/StadiumQuiz'
import { buildKitPool } from './data/kitUtils.js'
import { useLang } from './i18n/index.js'
import './App.css'

export default function App() {
  // Re-renders the whole tree on a language change; components read messages through t()
  useLang()
  const [screen, setScreen] = useState('menu')
  // Brief scopes live here so they survive a round of the quiz
  const [kitScope, setKitScope] = useState(null) // set by KitSettings once the kit manifest is loaded
  const [stadiumScope, setStadiumScope] = useState({ continents: ['europe'], countries: [], minCapacity: 0 })
  const [quizClubs, setQuizClubs] = useState([])
  const [quizStadiums, setQuizStadiums] = useState([])

  function startKitQuiz() {
    setQuizClubs(buildKitPool(kitScope))
    setScreen('kit-quiz')
  }

  function startStadiumQuiz(stadiums) {
    setQuizStadiums(stadiums)
    setScreen('stadium-quiz')
  }

  function handleMenuSelect(id) {
    if (id === 'kit-quiz') setScreen('kit-settings')
    else if (id === 'stadium-quiz') setScreen('stadium-settings')
  }

  const toMenu = () => setScreen('menu')

  return (
    <div className="app">
      {screen === 'menu' && <Menu onSelect={handleMenuSelect} />}
      {screen === 'kit-settings' && (
        <KitSettings scope={kitScope} setScope={setKitScope} onStart={startKitQuiz} onBack={toMenu} />
      )}
      {screen === 'kit-quiz' && (
        <KitQuiz
          clubs={quizClubs}
          kind={kitScope.kind}
          kitTypes={kitScope.kits}
          onBack={() => setScreen('kit-settings')}
          onMenu={toMenu}
        />
      )}
      {screen === 'stadium-settings' && (
        <StadiumSettings scope={stadiumScope} setScope={setStadiumScope} onStart={startStadiumQuiz} onBack={toMenu} />
      )}
      {screen === 'stadium-quiz' && (
        <StadiumQuiz
          stadiums={quizStadiums}
          onBack={() => setScreen('stadium-settings')}
          onMenu={toMenu}
        />
      )}
    </div>
  )
}
