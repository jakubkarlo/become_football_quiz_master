import { useState, useEffect } from 'react'
import {
  loadKitsManifest, defaultKitScope, getRegions, regionLabel, getLeaguesIn, getSeasonsFor, selectedRegions, selectedCompetitions, selectedSeasons,
  buildKitPool, countKits, leagueName, leagueCountryLabel, seasonShort, seasonLong, KIT_TYPES, TEAM_KINDS,
} from '../data/kitUtils.js'
import { listLabel } from '../data/format.js'
import { t } from '../i18n/index.js'
import { ScopeHeader, Field, ToggleGrid, Pick, StartBar, Sheet } from './ScopeControls.jsx'

// 'Od 18/19 do 25/26' for a contiguous range, otherwise the latest few; `available` is newest first
function seasonsLabel(selected, available) {
  if (!selected.length) return t('common.none')
  if (selected.length === available.length && available.length > 1) return t('kits.allSeasons')
  const all = available.slice().reverse() // oldest first
  const idx = selected.map(s => all.indexOf(s)).sort((a, b) => a - b)
  const contiguous = idx.every((v, i) => !i || v === idx[i - 1] + 1)
  if (contiguous) {
    return idx.length === 1 ? seasonShort(all[idx[0]])
      : t('kits.seasonRange', { from: seasonShort(all[idx[0]]), to: seasonShort(all[idx.at(-1)]) })
  }
  return listLabel(idx.reverse().map(i => seasonShort(all[i])), t('common.none'))
}

// Loads the kit manifest, then shows the scope form. `scope` is null until the first load,
// because the default depends on which continents have kits.
export default function KitSettings({ scope, setScope, onStart, onBack }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(null) // i18n key
  const [request, setRequest] = useState(0) // bumped to retry loading the manifest

  useEffect(() => {
    let cancelled = false
    loadKitsManifest()
      .then(() => { if (!cancelled) setLoaded(true) })
      .catch(err => {
        console.error('Failed to load kits manifest', err)
        if (!cancelled) setError('kits.loadListError')
      })
    return () => { cancelled = true }
  }, [request])

  useEffect(() => {
    if (loaded && !scope) setScope(defaultKitScope())
  }, [loaded, scope, setScope])

  if (!loaded || !scope) {
    return (
      <div className="screen">
        <ScopeHeader kicker={t('kits.kicker')} title={t('scope.title')} onBack={onBack} />
        <div className="scope-body">
          <div className="scope-status">
            {t(error ?? 'kits.loadingList')}
            {error && (
              <button className="btn btn-ghost" onClick={() => { setError(null); setRequest(n => n + 1) }}>
                {t('common.retry')}
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

  const leaguesSub = !leagues.length ? t('kits.pickContinentFirst')
    : competitions.length ? [...new Set(competitions.map(leagueCountryLabel))].join(' · ')
    : t('kits.pickAtLeastOneLeague')
  const seasonsSub = !competitions.length ? t(isClub ? 'kits.pickLeagueFirst' : 'kits.pickConfederationFirst')
    : !seasons.length ? t(isClub ? 'kits.noCommonSeasonLeagues' : 'kits.noCommonSeasonConfederations')
    : selSeasons.length ? t('kits.seasonCount', { count: selSeasons.length })
    : t('kits.pickAtLeastOneSeason')

  return (
    <div className="screen">
      <ScopeHeader kicker={t('kits.kicker')} title={t('scope.title')} onBack={onBack} />

      <div className="scope-body">
        <Field label={t('kits.teamKind')}>
          <ToggleGrid items={TEAM_KINDS.map(k => [k, t(`kits.kind.${k}`)])} sel={[scope.kind]} onToggle={kind => set('kind', kind)} />
        </Field>

        <Field label={t(isClub ? 'kits.continent' : 'kits.confederation')} hint={`${selRegions.length} / ${regions.length}`}>
          <ToggleGrid
            cols={Math.min(3, regions.length)}
            items={regions.map(r => [r, regionLabel(scope.kind, r)])}
            sel={selRegions}
            onToggle={r => toggleIn('regions', r)}
          />
        </Field>

        {isClub && (
          <Field label={t('kits.leagues')} hint={`${competitions.length} / ${leagues.length}`}>
            <Pick
              value={listLabel(competitions.map(leagueName), t('common.none'))}
              sub={leaguesSub}
              onClick={() => leagues.length && setSheet('league')}
            />
          </Field>
        )}

        <Field label={t('kits.seasons')} hint={`${selSeasons.length} / ${seasons.length}`}>
          <Pick
            value={seasonsLabel(selSeasons, seasons)}
            sub={seasonsSub}
            onClick={() => seasons.length && setSheet('season')}
          />
        </Field>

        <Field label={t('kits.kitType')} hint={`${scope.kits.length} / ${KIT_TYPES.length}`}>
          <ToggleGrid items={KIT_TYPES.map(id => [id, t(`kits.type.${id}`)])} sel={scope.kits} onToggle={id => toggleIn('kits', id)} />
        </Field>
      </div>

      <StartBar count={count} unit={t('kits.poolUnit')} onStart={onStart} />

      <Sheet
        open={sheet === 'league'}
        groups
        title={t('kits.leagues')}
        search={t('kits.searchLeague')}
        items={leagues.map(l => ({ id: l, label: leagueName(l), group: leagueCountryLabel(l) }))}
        sel={competitions}
        // Keep leagues of currently hidden continents selected, so they come back with those continents
        setSel={v => set('leagues', [...scope.leagues.filter(l => !leagues.includes(l)), ...v])}
        onClose={() => setSheet(null)}
      />
      <Sheet
        open={sheet === 'season'}
        title={t('kits.seasons')}
        search={t('kits.searchSeason')}
        items={seasons.map(s => ({ id: s, label: seasonLong(s) }))}
        sel={selSeasons}
        setSel={v => set('seasons', v)}
        onClose={() => setSheet(null)}
      />
    </div>
  )
}
