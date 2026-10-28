// Automatic progression scaffold. DISABLED by default and not wired into the UI.
// The ladder below is a PROPOSAL from the plan owner. It is not medically validated.
// Nothing activates before the readiness review on 2 Nov 2026 is recorded.
export const PROGRESSION_ENABLED = false
export const READINESS_REVIEW_DAY = '2026-11-02'

export type Ex = 'mini-squat' | 'bridge' | 'wall-push-up' | 'bird-dog' | 'calf-raise'
export type Feel3 = 'easy' | 'medium' | 'hard'
export type Sym = 'pain' | 'dizziness' | 'breathing' | 'chest' | 'irregular-heartbeat' | 'illness' | 'none'

export const LADDER: Record<Ex, number[]> = {
  'mini-squat': [5, 8, 10, 12],
  'bridge': [5, 8, 10, 12],
  'wall-push-up': [5, 8, 10, 12],
  'calf-raise': [5, 8, 10, 12], // capped at 12
  'bird-dog': [3, 4, 5, 6],
}
export const MIN_GOOD_SESSIONS = 2 // consecutive easy/medium sessions at the current step
const TIER1: Sym[] = ['chest', 'dizziness', 'breathing', 'irregular-heartbeat']

export interface Entry { day: string; feel: Feel3; symptom: Sym; ex?: Ex }
export interface ProgState {
  activatedOn: string | null            // set only after the 2 Nov readiness review is recorded
  step: Record<string, number>          // per exercise ladder index
  history: Entry[]
  lock: { since: string; reason: Sym } | null   // tier-1 symptom lock, persistent
  holds: Record<string, string>         // exercise -> day a local pain hold began
  lastChange: { day: string; ex: Ex; from: number; to: number } | null // for revert
}
export const emptyProg = (): ProgState => ({ activatedOn: null, step: {}, history: [], lock: null, holds: {}, lastChange: null })

export function recordFeedback(s: ProgState, e: Entry): ProgState {
  const h = [...s.history, e].slice(-60)
  let lock = s.lock
  if (TIER1.includes(e.symptom) && !lock) lock = { since: e.day, reason: e.symptom }
  const holds = { ...s.holds }
  if (e.symptom === 'pain' && e.ex) holds[e.ex] = e.day
  return { ...s, history: h, lock, holds }
}
// Only a recorded confirmation that medical advice was obtained unlocks. "Fine" does not.
export function recordMedicalAdvice(s: ProgState): ProgState { return { ...s, lock: null } }
export function clearPainHold(s: ProgState, ex: Ex): ProgState { const holds = { ...s.holds }; delete holds[ex]; return { ...s, holds } }

export function activate(s: ProgState, today: string, readinessRecorded: boolean): ProgState {
  if (!PROGRESSION_ENABLED || !readinessRecorded || today < READINESS_REVIEW_DAY) return s
  return { ...s, activatedOn: today }
}

// Hard never triggers an increase. Missed days never double anything. One exercise changes per session.
export function nextChange(s: ProgState, today: string): { ex: Ex; from: number; to: number } | null {
  if (!PROGRESSION_ENABLED || !s.activatedOn || today < s.activatedOn || s.lock) return null
  if (s.lastChange && s.lastChange.day === today) return null
  const recent = s.history.filter(e => !s.lastChange || e.day > s.lastChange.day)
  for (const ex of Object.keys(LADDER) as Ex[]) {
    if (s.holds[ex]) continue
    const idx = s.step[ex] ?? 0
    if (idx >= LADDER[ex].length - 1) continue
    const mine = s.history.filter(e => e.ex === ex || !e.ex)
    const since = s.lastChange && s.lastChange.ex === ex ? mine.filter(e => e.day > s.lastChange!.day) : mine
    const last = since.slice(-MIN_GOOD_SESSIONS)
    if (last.length < MIN_GOOD_SESSIONS) continue
    if (last.every(e => (e.feel === 'easy' || e.feel === 'medium') && e.symptom === 'none')) return { ex, from: idx, to: idx + 1 }
    void recent
  }
  return null
}
export function applyChange(s: ProgState, today: string): ProgState {
  const c = nextChange(s, today)
  if (!c) return s
  return { ...s, step: { ...s.step, [c.ex]: c.to }, lastChange: { day: today, ex: c.ex, from: c.from, to: c.to } }
}
export function revertLast(s: ProgState): ProgState {
  const c = s.lastChange
  if (!c) return s
  return { ...s, step: { ...s.step, [c.ex]: c.from }, lastChange: null }
}
export function reps(s: ProgState, ex: Ex): number { return LADDER[ex][s.step[ex] ?? 0] }
