import { useState, useEffect } from 'react'
import {
  loadKitsManifest, defaultKitScope, getRegions, regionLabel, getLeaguesIn, getSeasonsFor, selectedRegions, selectedCompetitions, selectedSeasons,
  buildKitPool, countKits, leagueName, leagueCountryLabel, seasonShort, seasonLong, KIT_TYPE_OPTIONS, TEAM_KIND_OPTIONS,
} from '../data/kitUtils.js'
import { plural, listLabel } from '../data/format.js'
import { ScopeHeader, Field, ToggleGrid, Pick, StartBar, Sheet } from './ScopeControls.jsx'

// 'Od 18/19 do 25/26' for a contiguous range, otherwise the latest few; `available` is newest first
function seasonsLabel(selected, available) {
  if (!selected.length) return 'Brak'
  if (selected.length === available.length && available.length > 1) return 'Wszystkie sezony'
  const all = available.slice().reverse() // oldest first
  const idx = selected.map(s => all.indexOf(s)).sort((a, b) => a - b)
  const contiguous = idx.every((v, i) => !i || v === idx[i - 1] + 1)
  if (contiguous) {
    return idx.length === 1 ? seasonShort(all[idx[0]]) : `Od ${seasonShort(all[idx[0]])} do ${seasonShort(all[idx.at(-1)])}`
  }
  return listLabel(idx.reverse().map(i => seasonShort(all[i])), 'Brak')
}

// Loads the kit manifest, then shows the scope form. `scope` is null until the first load,
// because the default depends on which continents have kits.
export default function KitSettings({ scope, setScope, onStart, onBack }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null)
  const [request, setRequest] = useState(0) // bumped to retry loading the manifest

  useEffect(() => {
    let cancelled = false
    loadKitsManifest()
      .then(() => { if (!cancelled) setLoaded(true) })
      .catch(err => {
        console.error('Failed to load kits manifest', err)
        if (!cancelled) setError('Nie udało się wczytać listy koszulek.')
      })
    return () => { cancelled = true }
  }, [request])

  useEffect(() => {
    if (loaded && !scope) setScope(defaultKitScope())
  }, [loaded, scope, setScope])

  if (!loaded || !scope) {
    return (
      <div className="screen">
        <ScopeHeader kicker="Koszulki" title="Zakres odprawy" onBack={onBack} />
        <div className="scope-body">
          <div className="scope-status">
            {error ?? 'Wczytywanie listy koszulek…'}
            {error && (
              <button className="btn btn-ghost" onClick={() => { setError(null); setRequest(n => n + 1) }}>
                Spróbuj ponownie
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
  return <KitScopeForm scope={scope} setScope={setScope} onStart={onStart} onBack={onBack} />
}

// Order of choices: team kind → continent/confederation → leagues (clubs only) → seasons → kit type.
// Nothing beyond the continent is preselected and Start stays disabled until the pool is non-empty.
function KitScopeForm({ scope, setScope, onStart, onBack }) {
  const [sheet, setSheet] = useState(null)
  const set = (key, value) => setScope({ ...scope, [key]: value })
  const isClub = scope.kind === 'club'

  const regions = getRegions(scope.kind)
  const selRegions = selectedRegions(scope)
  const leagues = isClub ? getLeaguesIn(selRegions) : []
  const competitions = selectedCompetitions(scope)
  const seasons = getSeasonsFor(competitions)
  const selSeasons = selectedSeasons(scope)
  const count = scope.kits.length ? countKits(buildKitPool(scope), scope.kits) : 0

  function toggleIn(key, id) {
    set(key, scope[key].includes(id) ? scope[key].filter(x => x !== id) : [...scope[key], id])
  }

  const leaguesSub = !leagues.length ? 'Najpierw wybierz kontynent'
    : competitions.length ? [...new Set(competitions.map(leagueCountryLabel))].join(' · ')
    : 'Wybierz przynajmniej jedną'
  const seasonsSub = !competitions.length ? (isClub ? 'Najpierw wybierz ligę' : 'Najpierw wybierz konfederację')
    : selSeasons.length ? `${selSeasons.length} ${plural(selSeasons.length, 'sezon', 'sezony', 'sezonów')}`
    : 'Wybierz przynajmniej jeden'

  return (
    <div className="screen">
      <ScopeHeader kicker="Koszulki" title="Zakres odprawy" onBack={onBack} />

      <div className="scope-body">
        <Field label="Rodzaj drużyn">
          <ToggleGrid items={TEAM_KIND_OPTIONS} sel={[scope.kind]} onToggle={kind => set('kind', kind)} />
        </Field>

        <Field label={isClub ? 'Kontynent' : 'Konfederacja'} hint={`${selRegions.length} / ${regions.length}`}>
          <ToggleGrid
            cols={Math.min(3, regions.length)}
            items={regions.map(r => [r, regionLabel(scope.kind, r)])}
            sel={selRegions}
            onToggle={r => toggleIn('regions', r)}
          />
        </Field>

        {isClub && (
          <Field label="Ligi" hint={`${competitions.length} / ${leagues.length}`}>
            <Pick
              value={listLabel(competitions.map(leagueName), 'Brak')}
              sub={leaguesSub}
              onClick={() => leagues.length && setSheet('league')}
            />
          </Field>
        )}

        <Field label="Sezony" hint={`${selSeasons.length} / ${seasons.length}`}>
          <Pick
            value={seasonsLabel(selSeasons, seasons)}
            sub={seasonsSub}
            onClick={() => seasons.length && setSheet('season')}
          />
        </Field>

        <Field label="Rodzaj koszulki" hint={`${scope.kits.length} / ${KIT_TYPE_OPTIONS.length}`}>
          <ToggleGrid items={KIT_TYPE_OPTIONS} sel={scope.kits} onToggle={id => toggleIn('kits', id)} />
        </Field>
      </div>

      <StartBar count={count} unit="Koszulek w puli" onStart={onStart} />

      <Sheet
        open={sheet === 'league'}
        groups
        title="Ligi"
        search="Szukaj ligi…"
        items={leagues.map(l => ({ id: l, label: leagueName(l), group: leagueCountryLabel(l) }))}
        sel={competitions}
        // Keep leagues of currently hidden continents selected, so they come back with those continents
        setSel={v => set('leagues', [...scope.leagues.filter(l => !leagues.includes(l)), ...v])}
        onClose={() => setSheet(null)}
      />
      <Sheet
        open={sheet === 'season'}
        title="Sezony"
        search="Szukaj sezonu…"
        items={seasons.map(s => ({ id: s, label: seasonLong(s) }))}
        sel={selSeasons}
        setSel={v => set('seasons', v)}
        onClose={() => setSheet(null)}
      />
    </div>
  )
}
