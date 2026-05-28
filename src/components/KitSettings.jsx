import { useState } from 'react'
import { getSeasons, getLeagues, buildClubList } from '../data/kitUtils.js'
import './KitSettings.css'

function seasonLabel(s) { return s.replace('_', '/') }

const KIT_TYPE_OPTIONS = [
  { value: 1,     label: 'Domowa' },
  { value: 2,     label: 'Wyjazdowa' },
  { value: 3,     label: 'Trzecia' },
  { value: 'alt', label: 'Alternatywna' },
]

export default function KitSettings({ onStart }) {
  const seasons = getSeasons()
  const [selSeason, setSelSeason] = useState(null)
  const [selLeagues, setSelLeagues] = useState([])
  const [selKitTypes, setSelKitTypes] = useState([1, 2, 3, 'alt'])

  const availableLeagues = selSeason
    ? getLeagues(selSeason)
    : [...new Set(seasons.flatMap(s => getLeagues(s)))]

  function toggleLeague(l) {
    setSelLeagues(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])
  }

  function toggleKitType(t) {
    setSelKitTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  function handleSeasonClick(s) {
    if (selSeason === s) {
      setSelSeason(null)
      setSelLeagues([])
    } else {
      setSelSeason(s)
      setSelLeagues([])
    }
  }

  function handleStart() {
    const clubs = buildClubList(selSeason ? [selSeason] : [], selLeagues)
    onStart(clubs, selKitTypes)
  }

  const clubList = buildClubList(selSeason ? [selSeason] : [], selLeagues)
  const typeNums = selKitTypes.filter(t => typeof t === 'number')
  const includeAlt = selKitTypes.includes('alt')
  const totalKits = clubList.reduce((sum, c) => {
    const main = (c.kits || [1, 2, 3]).filter(k => typeNums.includes(k)).length
    const alt = includeAlt ? (c.altUrls || []).length : 0
    return sum + main + alt
  }, 0)

  return (
    <div className="kit-settings">
      <div className="settings-heading">
        <h2>Koszulki</h2>
        <p>Wybierz zakres lub kliknij Start żeby grać ze wszystkim</p>
      </div>

      <div className="settings-section">
        <div className="settings-label">Sezon</div>
        <div className="chip-row">
          {seasons.map(s => (
            <button
              key={s}
              className={`chip${selSeason === s ? ' chip-active' : ''}`}
              onClick={() => handleSeasonClick(s)}
            >
              {seasonLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-label">Liga</div>
        <div className="chip-row">
          {availableLeagues.map(l => (
            <button
              key={l}
              className={`chip${selLeagues.includes(l) ? ' chip-active' : ''}`}
              onClick={() => toggleLeague(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-label">Zestaw koszulek</div>
        <div className="chip-row">
          {KIT_TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              className={`chip${selKitTypes.includes(value) ? ' chip-active' : ''}`}
              onClick={() => toggleKitType(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-summary">
        {totalKits} koszulek w puli
      </div>

      <button className="btn-primary" onClick={handleStart} disabled={selKitTypes.length === 0}>
        Rozpocznij quiz →
      </button>
    </div>
  )
}
