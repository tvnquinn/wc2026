'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  clearAllMatchResults,
  loginLeagueAdmin,
  resetLeague,
  setMatchResult,
  setMatchResultsBatch,
  type MatchResultInput,
} from '@/app/actions'
import { LeagueResultOverride, Match } from '@prisma/client'
import { isKnockoutStage, isRegulationDraw } from '@/lib/penalties'
import AdminMatchRow, { type AdminScoreState } from './AdminMatchRow'

function initialScoresForMatch(
  match: Match,
  isGlobalScorer: boolean,
  override: LeagueResultOverride | null | undefined
): AdminScoreState {
  if (isGlobalScorer) {
    return {
      homeScore: match.homeScore?.toString() ?? '',
      awayScore: match.awayScore?.toString() ?? '',
      pkHome: match.pkHomeScore?.toString() ?? '',
      pkAway: match.pkAwayScore?.toString() ?? '',
    }
  }
  return {
    homeScore: override?.homeScore?.toString() ?? '',
    awayScore: override?.awayScore?.toString() ?? '',
    pkHome: override?.pkHomeScore?.toString() ?? '',
    pkAway: override?.pkAwayScore?.toString() ?? '',
  }
}

function scoresMatchSaved(
  scores: AdminScoreState,
  match: Match,
  isGlobalScorer: boolean,
  override: LeagueResultOverride | null | undefined
): boolean {
  const saved = initialScoresForMatch(match, isGlobalScorer, override)
  return (
    scores.homeScore === saved.homeScore &&
    scores.awayScore === saved.awayScore &&
    scores.pkHome === saved.pkHome &&
    scores.pkAway === saved.pkAway
  )
}

function canSaveMatchScores(match: Match, scores: AdminScoreState): boolean {
  if (scores.homeScore === '' || scores.awayScore === '') return false
  const home = parseInt(scores.homeScore, 10)
  const away = parseInt(scores.awayScore, 10)
  if (isNaN(home) || isNaN(away)) return false
  const showPenalties = isKnockoutStage(match.stage) && isRegulationDraw(scores.homeScore, scores.awayScore)
  if (showPenalties) {
    if (scores.pkHome === '' || scores.pkAway === '') return false
    const pkHome = parseInt(scores.pkHome, 10)
    const pkAway = parseInt(scores.pkAway, 10)
    if (isNaN(pkHome) || isNaN(pkAway) || pkHome === pkAway) return false
  }
  return true
}

function toMatchResultInput(matchId: string, scores: AdminScoreState, match: Match): MatchResultInput {
  const showPenalties = isKnockoutStage(match.stage) && isRegulationDraw(scores.homeScore, scores.awayScore)
  return {
    matchId,
    homeScoreStr: scores.homeScore,
    awayScoreStr: scores.awayScore,
    pkHomeScoreStr: showPenalties ? scores.pkHome : undefined,
    pkAwayScoreStr: showPenalties ? scores.pkAway : undefined,
  }
}

export default function AdminClient({
  leagueSlug,
  isGlobalScorer,
  matches,
  overrides,
  initialAuthenticated,
}: {
  leagueSlug: string
  isGlobalScorer: boolean
  matches: Match[]
  overrides: LeagueResultOverride[]
  initialAuthenticated: boolean
}) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(initialAuthenticated)
  const [isResetting, setIsResetting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savedMatchId, setSavedMatchId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const overrideByMatchId = useMemo(
    () => new Map(overrides.map((o) => [o.matchId, o])),
    [overrides]
  )

  const [scoresByMatchId, setScoresByMatchId] = useState<Record<string, AdminScoreState>>(() => {
    const init: Record<string, AdminScoreState> = {}
    for (const match of matches) {
      init[match.id] = initialScoresForMatch(
        match,
        isGlobalScorer,
        overrideByMatchId.get(match.id)
      )
    }
    return init
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await loginLeagueAdmin(leagueSlug, password)
      setAuthenticated(true)
    } catch {
      alert('Incorrect admin password')
    }
  }

  const handleClearResults = async () => {
    if (
      !confirm(
        'Clear every match result globally? Predictions stay, but all points reset to 0 until results are re-entered.'
      )
    ) {
      return
    }
    setIsClearing(true)
    try {
      await clearAllMatchResults(leagueSlug)
      alert('All match results cleared.')
      window.location.reload()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Clear failed'
      alert(message)
    } finally {
      setIsClearing(false)
    }
  }

  const handleResetLeague = async () => {
    if (!confirm('This will delete all users and predictions in THIS league only. Continue?')) return
    setIsResetting(true)
    try {
      await resetLeague(leagueSlug)
      alert('League reset. Users and predictions cleared.')
      window.location.reload()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reset failed'
      alert(message)
    } finally {
      setIsResetting(false)
    }
  }

  const handleSaveMatch = async (matchId: string) => {
    const match = matches.find((m) => m.id === matchId)
    const scores = scoresByMatchId[matchId]
    if (!match || !scores || !canSaveMatchScores(match, scores)) return

    setSavingMatchId(matchId)
    setSavedMatchId(null)

    try {
      await setMatchResult(
        leagueSlug,
        matchId,
        scores.homeScore,
        scores.awayScore,
        isKnockoutStage(match.stage) && isRegulationDraw(scores.homeScore, scores.awayScore)
          ? scores.pkHome
          : undefined,
        isKnockoutStage(match.stage) && isRegulationDraw(scores.homeScore, scores.awayScore)
          ? scores.pkAway
          : undefined
      )
      setSavedMatchId(matchId)
      router.refresh()
      setTimeout(() => setSavedMatchId((current) => (current === matchId ? null : current)), 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed'
      alert(message)
    } finally {
      setSavingMatchId(null)
    }
  }

  const handleSaveAll = async () => {
    const dirtyInputs: MatchResultInput[] = []

    for (const match of matches) {
      const scores = scoresByMatchId[match.id]
      if (!scores) continue
      if (!canSaveMatchScores(match, scores)) continue
      if (
        scoresMatchSaved(
          scores,
          match,
          isGlobalScorer,
          overrideByMatchId.get(match.id)
        )
      ) {
        continue
      }
      dirtyInputs.push(toMatchResultInput(match.id, scores, match))
    }

    if (dirtyInputs.length === 0) {
      alert('No changed results to save.')
      return
    }

    setSaving(true)
    setSaveSuccess(false)

    try {
      const { appliedCount } = await setMatchResultsBatch(leagueSlug, dirtyInputs)

      if (appliedCount === 0) {
        alert('No changed results to save.')
        return
      }

      setSaveSuccess(true)
      router.refresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed'
      alert(message)
    } finally {
      setSaving(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="card" style={{ maxWidth: '400px', margin: '4rem auto' }}>
        <h2>
          {isGlobalScorer
            ? 'Login to enter official World Cup scores'
            : 'Login to enter results for your league'}
        </h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            className="input"
            placeholder="League admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn">Login</button>
        </form>
      </div>
    )
  }

  return (
    <div className="predict-with-save-bar" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="card" style={{ textAlign: 'center', border: '1px dashed var(--text)' }}>
        <h3 style={{ marginBottom: '1rem' }}>League Management</h3>
        <p style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
          {isGlobalScorer
            ? 'You set the official World Cup scores used by all leagues that have not entered their own results.'
            : 'Results you enter here only affect scoring in this league. Any match you leave blank uses the shared official World Cup scoreboard.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isGlobalScorer && (
            <button
              onClick={handleClearResults}
              className="btn"
              disabled={isClearing}
              style={{ background: 'var(--text-muted)' }}
            >
              {isClearing ? 'Clearing...' : 'Clear All Results'}
            </button>
          )}
          <button
            onClick={handleResetLeague}
            className="btn"
            style={{ background: 'var(--danger)' }}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset This League'}
          </button>
        </div>
      </div>

      {matches.map((match) => {
        const scores = scoresByMatchId[match.id]
        const override = overrideByMatchId.get(match.id) ?? null
        return (
          <AdminMatchRow
            key={match.id}
            isGlobalScorer={isGlobalScorer}
            match={match}
            override={override}
            scores={scores}
            onScoresChange={(next) =>
              setScoresByMatchId((prev) => ({ ...prev, [match.id]: next }))
            }
            onSave={() => handleSaveMatch(match.id)}
            isSaving={savingMatchId === match.id}
            saveSuccess={savedMatchId === match.id}
            isDirty={!scoresMatchSaved(scores, match, isGlobalScorer, override)}
            canSave={canSaveMatchScores(match, scores)}
          />
        )
      })}

      {mounted &&
        createPortal(
          <div className="predict-save-bar">
            <button
              type="button"
              className="btn"
              onClick={handleSaveAll}
              disabled={saving}
              style={{
                background: saveSuccess ? 'var(--primary)' : 'var(--accent)',
                color: saveSuccess ? '#fff' : '#000',
                boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                border: '2px solid #000',
              }}
            >
              {saving ? 'Saving...' : saveSuccess ? '✓ Changed Results Saved' : '💾 Save Changed Results'}
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}
