import { useState } from 'react'
import { getContinents, getCountries, buildStadiumList, CAPACITY_THRESHOLDS } from '../data/stadiumUtils.js'
import { continentLabel, countryLabel } from '../data/geoLabels.js'
import './KitSettings.css'
import './StadiumSettings.css'

function capacityLabel(min) {
  return min ? `${min / 1000}k+` : 'Wszystkie'
}

export default function StadiumSettings({ onStart, onBack }) {
  const continents = getContinents()
  const [selContinents, setSelContinents] = useState([])
  const [selCountries, setSelCountries] = useState([])
  const [minCapacity, setMinCapacity] = useState(0)

  const availableCountries = getCountries(selContinents)
  const stadiumList = buildStadiumList(selContinents, selCountries, minCapacity)

  function toggleContinent(c) {
    setSelContinents(prev => {
      const next = prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
      const valid = getCountries(next)
      setSelCountries(sc => sc.filter(x => valid.includes(x)))
      return next
    })
  }

  function toggleCountry(c) {
    setSelCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  return (
    <div className="stadium-settings">
      <div className="settings-header">
        <button className="header-back" onClick={onBack}>&#8249;</button>
        <div className="settings-header-info">
          <div className="header-label">STADIONY · D-02</div>
          <div className="settings-title">Zakres briefa</div>
        </div>
      </div>

      <div className="settings-body">
        <div className="settings-section">
          <div className="settings-label">KONTYNENT</div>
          <div className="chip-row">
            {continents.map(c => (
              <button
                key={c}
                className={`chip${selContinents.includes(c) ? ' chip-active' : ''}`}
                onClick={() => toggleContinent(c)}
              >
                {continentLabel(c)}
              </button>
            ))}
          </div>
        </div>

        {availableCountries.length > 0 && (
          <div className="settings-section">
            <div className="settings-label">KRAJ</div>
            <div className="chip-row">
              {availableCountries.map(c => (
                <button
                  key={c}
                  className={`chip${selCountries.includes(c) ? ' chip-active' : ''}`}
                  onClick={() => toggleCountry(c)}
                >
                  {countryLabel(c)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="settings-section">
          <div className="settings-label">POJEMNOŚĆ</div>
          <div className="chip-row">
            {CAPACITY_THRESHOLDS.map(min => (
              <button
                key={min}
                className={`chip${minCapacity === min ? ' chip-active' : ''}`}
                onClick={() => setMinCapacity(min)}
              >
                {capacityLabel(min)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-summary">
          <span className="summary-count">{stadiumList.length}</span>
          <span className="summary-label"> stadionów w puli</span>
        </div>
      </div>

      <div className="settings-footer">
        <button
          className="btn-start"
          onClick={() => onStart(stadiumList)}
          disabled={stadiumList.length === 0}
        >
          Rozpocznij brief →
        </button>
      </div>
    </div>
  )
}
