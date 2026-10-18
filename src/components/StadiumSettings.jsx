import { useState, useEffect } from 'react'
import {
  loadStadiumIndex, loadStadiumList, getContinents, getCountries, getCountryName, countStadiums, CAPACITY_THRESHOLDS,
} from '../data/stadiumUtils.js'
import { continentLabel } from '../data/geoLabels.js'
import './KitSettings.css'
import './StadiumSettings.css'

function capacityLabel(min) {
  return min ? `${min / 1000}k+` : 'Wszystkie'
}

export default function StadiumSettings({ onStart, onBack }) {
  const [index, setIndex] = useState(null)
  const [error, setError] = useState(null)
  const [indexRequest, setIndexRequest] = useState(0) // bumped to retry loading the index
  const [starting, setStarting] = useState(false)
  const [selContinents, setSelContinents] = useState([])
  const [selCountries, setSelCountries] = useState([])
  const [minCapacity, setMinCapacity] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadStadiumIndex()
      .then(i => { if (!cancelled) setIndex(i) })
      .catch(err => {
        console.error('Failed to load stadium index', err)
        if (!cancelled) setError('Nie udało się wczytać listy stadionów.')
      })
    return () => { cancelled = true }
  }, [indexRequest])

  function retry() {
    setError(null)
    setIndexRequest(n => n + 1)
  }

  function toggleContinent(c) {
    setSelContinents(prev => {
      const next = prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
      const valid = getCountries(index, next)
      setSelCountries(sc => sc.filter(x => valid.includes(x)))
      return next
    })
  }

  function toggleCountry(c) {
    setSelCountries(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function start() {
    setStarting(true)
    try {
      onStart(await loadStadiumList(index, selContinents, selCountries, minCapacity))
    } catch (err) {
      console.error('Failed to load stadiums', err)
      setError('Nie udało się wczytać stadionów.')
      setStarting(false)
    }
  }

  const continents = index ? getContinents(index) : []
  const availableCountries = index ? getCountries(index, selContinents) : []
  const poolSize = index ? countStadiums(index, selContinents, selCountries, minCapacity) : 0

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
        {error && (
          <div className="settings-status">
            {error}
            <button className="chip" onClick={index ? () => setError(null) : retry}>Spróbuj ponownie</button>
          </div>
        )}

        {!index && !error && <div className="settings-status">Wczytywanie listy stadionów…</div>}

        {index && (
          <>
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
                      {getCountryName(index, c)}
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
              <span className="summary-count">{poolSize}</span>
              <span className="summary-label"> stadionów w puli</span>
            </div>
          </>
        )}
      </div>

      <div className="settings-footer">
        <button
          className="btn-start"
          onClick={start}
          disabled={!index || poolSize === 0 || starting}
        >
          {starting ? 'Wczytywanie stadionów…' : 'Rozpocznij brief →'}
        </button>
      </div>
    </div>
  )
}
