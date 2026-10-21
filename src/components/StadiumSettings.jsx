import { useState, useEffect } from 'react'
import {
  loadStadiumIndex, loadStadiumList, getContinents, getCountries, getCountryName, countStadiums, CAPACITY_THRESHOLDS,
} from '../data/stadiumUtils.js'
import { continentLabel } from '../data/geoLabels.js'
import { listLabel } from '../data/format.js'
import { t } from '../i18n/index.js'
import { ScopeHeader, Field, ToggleGrid, Pick, StartBar, Sheet } from './ScopeControls.jsx'

function capacityLabel(min) {
  return min ? `${min / 1000}k+` : t('common.all')
}

// Scope ({ continents, countries, minCapacity }) lives in App so it survives a round of the quiz.
// An empty country list means "every country of the selected continents".
export default function StadiumSettings({ scope, setScope, onStart, onBack }) {
  const [index, setIndex] = useState(null)
  const [error, setError] = useState(null) // i18n key
  const [indexRequest, setIndexRequest] = useState(0) // bumped to retry loading the index
  const [starting, setStarting] = useState(false)
  const [sheet, setSheet] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadStadiumIndex()
      .then(i => { if (!cancelled) setIndex(i) })
      .catch(err => {
        console.error('Failed to load stadium index', err)
        if (!cancelled) setError('stadiums.loadListError')
      })
    return () => { cancelled = true }
  }, [indexRequest])

  function retry() {
    setError(null)
    setIndexRequest(n => n + 1)
  }

  const continents = index ? getContinents(index) : []
  const selContinents = scope.continents.filter(c => continents.includes(c))
  // getCountries treats an empty selection as "all", the scope screen does not
  const countries = index && selContinents.length ? getCountries(index, selContinents) : []
  const selCountries = scope.countries.filter(c => countries.includes(c))
  const poolSize = countries.length ? countStadiums(index, selContinents, selCountries, scope.minCapacity) : 0
  const countryNames = keys => keys.map(k => getCountryName(index, k))

  function toggleContinent(c) {
    const next = selContinents.includes(c) ? selContinents.filter(x => x !== c) : [...selContinents, c]
    setScope({ ...scope, continents: next })
  }

  async function start() {
    setStarting(true)
    try {
      onStart(await loadStadiumList(index, selContinents, selCountries, scope.minCapacity))
    } catch (err) {
      console.error('Failed to load stadiums', err)
      setError('stadiums.loadError')
      setStarting(false)
    }
  }

  return (
    <div className="screen">
      <ScopeHeader kicker={t('stadiums.kicker')} title={t('scope.title')} onBack={onBack} />

      <div className="scope-body">
        {error && (
          <div className="scope-status">
            {t(error)}
            <button className="btn btn-ghost" onClick={index ? () => setError(null) : retry}>{t('common.retry')}</button>
          </div>
        )}

        {!index && !error && <div className="scope-status">{t('stadiums.loadingList')}</div>}

        {index && (
          <>
            <Field label={t('stadiums.continent')} hint={`${selContinents.length} / ${continents.length}`}>
              <ToggleGrid cols={3} items={continents.map(c => [c, continentLabel(c)])} sel={selContinents} onToggle={toggleContinent} />
            </Field>

            <Field label={t('stadiums.country')} hint={selCountries.length ? `${selCountries.length} / ${countries.length}` : t('common.all')}>
              <Pick
                value={selCountries.length ? listLabel(countryNames(selCountries), '') : t('stadiums.allCountries')}
                sub={
                  !countries.length ? t('stadiums.pickContinent')
                    : selCountries.length ? t('stadiums.stadiumCount', { count: poolSize })
                    : t('stadiums.countryCountNarrow', { count: countries.length })
                }
                onClick={() => countries.length && setSheet('country')}
              />
            </Field>

            <Field label={t('stadiums.capacity')}>
              <ToggleGrid
                items={CAPACITY_THRESHOLDS.map(min => [min, capacityLabel(min)])}
                sel={[scope.minCapacity]}
                onToggle={min => setScope({ ...scope, minCapacity: min })}
              />
            </Field>
          </>
        )}
      </div>

      <StartBar
        count={poolSize}
        unit={t('stadiums.poolUnit')}
        onStart={start}
        disabled={starting}
        busyLabel={starting ? t('common.loading') : null}
      />

      {index && (
        <Sheet
          open={sheet === 'country'}
          groups
          title={t('stadiums.country')}
          search={t('stadiums.searchCountry')}
          items={countries.map(c => ({ id: c, label: getCountryName(index, c) }))}
          sel={selCountries}
          setSel={v => setScope({ ...scope, countries: v })}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}
