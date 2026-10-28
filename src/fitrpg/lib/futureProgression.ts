// Dormant design from the plan owner. Logic tests do not establish medical safety.
// No user-facing control can enable this. Enabling needs the actual reviewed conversation,
// selected scope, atomic persistence and a separate reviewed release.
export const FUTURE_PROGRESSION_ENABLED = false
export type Core = 'mini-squat' | 'bridge' | 'wall-push-up' | 'bird-dog'
export type Optional = 'calf-raise' | 'bottle-curl' | 'standalone-walk'
export type Exercise = Core | Optional
export type Dose = number[]
export interface Observation {
  day: string; ex: Exercise; effort: 'easy' | 'medium' | 'hard'
  fullQuota: boolean; recovery: 'ok' | 'sore' | 'unknown'; symptom: string
  dose: Dose // actual prescribed sets/reps at that session, not guessed from current state
}
export interface Readiness {
  recordedOn: string; source: string; informed: boolean
  requiredStrengthDays: string[]; requiredWalkDays: string[]
  completedStrengthDays: string[]; completedWalkDays: string[]
  sessions: Observation[]; effectiveFrom: string
  selectedCore: Core[]; secondSetsSelected: boolean; optionalSelected: Optional[]
}
export interface Change { day: string; ex: Exercise; before: Dose; after: Dose; reason: 'easy' | 'regression' | 'undo' }
export interface FutureState {
  review: Readiness | null; optedOut: boolean; dose: Partial<Record<Exercise, Dose>>
  observations: Observation[]; changes: Change[]; lastUndo: string | null
}
export const CORE: Core[] = ['mini-squat', 'bridge', 'wall-push-up', 'bird-dog']
export const OPTIONAL: Optional[] = ['calf-raise', 'bottle-curl', 'standalone-walk']
export const emptyFuture = (): FutureState => ({ review: null, optedOut: false, dose: {}, observations: [], changes: [], lastUndo: null })
const days = (a: string, b: string) => Math.floor((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)
const date = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d
const same = (a: Dose, b: Dose) => JSON.stringify(a) === JSON.stringify(b)
export const baseline = (ex: Exercise): Dose => [ex === 'bird-dog' ? 3 : ex === 'standalone-walk' ? 10 : 5]
const qualifies = (o: Observation) => o.effort === 'easy' && o.fullQuota && o.recovery === 'ok' && o.symptom === 'none'
export function ladder(ex: Exercise, setsSelected: boolean): Dose[] {
  if (ex === 'standalone-walk') return [[10], [12], [15]] // minutes, never a second set
  const first = ex === 'bird-dog' ? [3, 4, 5, 6] : [5, 8, 10, 12]
  const out = first.map(x => [x])
  if (setsSelected && CORE.includes(ex as Core)) for (const n of first) out.push([first[first.length - 1], n])
  return out
}
export function nextScheduledAfter(day: string, core: Core[], optional: Optional[]): string | null {
  if (!date(day)) return null
  for(let n=1;n<=7;n++) {
    const t=new Date(day+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+n)
    const w=t.getUTCDay(), d=t.toISOString().slice(0,10)
    if ((core.length && [2,4,6].includes(w)) || (optional.includes('calf-raise') && w===2) || (optional.includes('bottle-curl') && w===4) || (optional.includes('standalone-walk') && [3,5].includes(w))) return d
  }
  return null
}
// This records a proposed reviewed decision, not authority from a UI checkbox or the date alone.
// Main supplies the source reference after the actual conversation; unknown/restricted readiness stays baseline.
export function recordReadiness(s: FutureState, r: Readiness): FutureState {
  if (r.effectiveFrom !== nextScheduledAfter(r.recordedOn, r.selectedCore, r.optionalSelected)) return s
  if (!r.source.trim() || !r.informed || !date(r.recordedOn) || !date(r.effectiveFrom) || r.recordedOn < '2026-11-02' || r.effectiveFrom <= r.recordedOn) return s
  if (new Set(r.requiredStrengthDays).size !== 3 || new Set(r.requiredWalkDays).size !== 2 || !r.sessions.length || !r.sessions.every(qualifies)) return s
  if (r.requiredStrengthDays.some(d => !r.completedStrengthDays.includes(d)) || r.requiredWalkDays.some(d => !r.completedWalkDays.includes(d))) return s
  if (r.requiredStrengthDays.some(d => !CORE.every(ex => r.sessions.some(o => o.day === d && o.ex === ex))) || r.requiredWalkDays.some(d => !r.sessions.some(o => o.day === d && o.ex === 'standalone-walk'))) return s
  const strength = r.sessions.filter(o => CORE.includes(o.ex as Core)).map(o => o.day)
  const walk = r.sessions.filter(o => o.ex === 'standalone-walk').map(o => o.day)
  if (r.completedStrengthDays.some(d => !strength.includes(d)) || r.completedWalkDays.some(d => !walk.includes(d))) return s
  if (r.sessions.some(o => !date(o.day) || o.day > r.recordedOn)) return s
  if (r.selectedCore.some(ex => !CORE.includes(ex)) || r.optionalSelected.some(ex => !OPTIONAL.includes(ex))) return s
  return { ...s, review: structuredClone(r), optedOut: false }
}
export function logObservation(s: FutureState, o: Observation): FutureState {
  if (!date(o.day)) return s
  // One row per exercise/day. A repeated submit cannot manufacture two qualifying sessions.
  const previous = s.observations.find(x => x.ex === o.ex && x.day === o.day)
  if (previous) return s // use a separate reviewed correction, never silently overwrite a symptom
  return { ...s, observations: [...s.observations, structuredClone(o)].slice(-600) }
}
export function optOut(s: FutureState): FutureState { return { ...s, optedOut: true } }
export interface Safety { lock: unknown; holds: Record<string, unknown> }
export function selected(s: FutureState, ex: Exercise): boolean {
  const r = s.review
  return !!r && (r.selectedCore.includes(ex as Core) || r.optionalSelected.includes(ex as Optional))
}
// Pure proposal only: callers cannot change a live prescription by invoking this.
export function propose(s: FutureState, ex: Exercise, today: string, safety: Safety): Change | null {
  const r = s.review
  const w = new Date(today+'T00:00:00Z').getUTCDay()
  const scheduledDay = CORE.includes(ex as Core) ? [2,4,6].includes(w) : ex === 'calf-raise' ? w === 2 : ex === 'bottle-curl' ? w === 4 : [3,5].includes(w)
  if (!scheduledDay) return null
  if (!date(today) || !r || s.optedOut || safety.lock || safety.holds[ex] || !selected(s, ex) || today < r.effectiveFrom) return null
  if (s.changes.some(c => c.day === today) || s.lastUndo === today) return null
  const current = s.dose[ex] ?? baseline(ex), steps = ladder(ex, r.secondSetsSelected)
  const index = steps.findIndex(d => same(d, current))
  if (index < 0) return null
  const previous = [...s.changes].reverse().find(c => c.ex === ex)
  if (previous && days(previous.day, today) < 7) return null
  // Review sessions establish readiness, not a shortcut through the new step's qualifying sessions.
  const since = previous?.day ?? r.recordedOn
  const recent = s.observations.filter(o => o.ex === ex && o.day > since && o.day < today && same(o.dose, current)).sort((a,b) => a.day.localeCompare(b.day)).slice(-2)
  if (recent.length < 2) return null
  if (recent.some(o => o.symptom !== 'none')) return null
  const backwards = current.length === 2 && (recent.every(o => o.effort === 'hard') || recent.every(o => !o.fullQuota))
  if (backwards) return { day: today, ex, before: [...current], after: [...steps[index - 1]], reason: 'regression' }
  if (index + 1 < steps.length && recent.every(qualifies)) return { day: today, ex, before: [...current], after: [...steps[index + 1]], reason: 'easy' }
  return null
}
// Pure state transition for offline testing/preparation. The live integration below remains disabled.
export function acceptProposal(s: FutureState, c: Change): FutureState {
  return { ...s, dose: { ...s.dose, [c.ex]: [...c.after] }, changes: [...s.changes, structuredClone(c)] }
}
export function undo(s: FutureState, today: string): FutureState {
  const c = s.changes[s.changes.length - 1]
  if (!c || c.reason === 'undo') return s
  // Keep history and cooldown. Undo is not a route to repeating an increase on the same day.
  return { ...s, dose: { ...s.dose, [c.ex]: [...c.before] }, lastUndo: today,
    changes: [...s.changes, { day: today, ex: c.ex, before: [...c.after], after: [...c.before], reason: 'undo' }] }
}
export function scheduled(s: FutureState, today: string, scheduledExercises: Exercise[], safety: Safety): FutureState {
  if (!FUTURE_PROGRESSION_ENABLED) return s
  for (const ex of scheduledExercises) { const c = propose(s, ex, today, safety); if (c) return acceptProposal(s, c) }
  return s
}
export function liveDose(s: FutureState | undefined, ex: Exercise, safety: Safety): Dose {
  if (!FUTURE_PROGRESSION_ENABLED || !s || s.optedOut || safety.lock || safety.holds[ex] || !selected(s, ex)) return baseline(ex)
  return s.dose[ex] ?? baseline(ex)
}
