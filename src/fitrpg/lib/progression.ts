// Automatic progression scaffold. DISABLED by default.
// The ladder is a PROPOSAL from the plan owner. It is not medically validated.
// Rules here are conservative logic only. Tests check the code does what is written, not that it is medically safe.
export const PROGRESSION_ENABLED = false

export type Ex = 'mini-squat' | 'bridge' | 'wall-push-up' | 'bird-dog' | 'calf-raise'
export type Feel3 = 'easy' | 'medium' | 'hard'
export type Sym = 'pain' | 'dizziness' | 'breathing' | 'chest' | 'irregular-heartbeat' | 'illness' | 'none'
export type Recovery = 'ok' | 'sore' | 'unknown'

export const LADDER: Record<Ex, number[]> = {
  'mini-squat': [5, 8, 10, 12],
  'bridge': [5, 8, 10, 12],
  'wall-push-up': [5, 8, 10, 12],
  'calf-raise': [5, 8, 10, 12], // capped at 12
  'bird-dog': [3, 4, 5, 6],
}
export const MIN_EASY_SESSIONS = 2   // consecutive Easy sessions at the current step
export const MIN_DAYS_BETWEEN = 7    // max 1 step per exercise per week
// Config: what is covered. Warm-up 5 min and cool-down 2 min are fixed. Rep phase only; second set is OUT for now.
export const CONFIG = { warmupMin: 5, cooldownMin: 2, repPhaseOnly: true, maxSets: 1,
  covered: { 'mini-squat': true, 'bridge': true, 'wall-push-up': true, 'bird-dog': true, 'calf-raise': true, 'bottle-curl': false, 'standalone-walk': false } as Record<string, boolean> }
export const PAIN_FREE_TO_CLEAR = 2
const TIER1: Sym[] = ['chest', 'dizziness', 'breathing', 'irregular-heartbeat']

// One logged session for one exercise.
export interface Entry {
  day: string; ex: Ex; feel: Feel3; symptom: Sym
  fullQuota: boolean          // all prescribed reps and sets done
  recoveryNextDay: Recovery   // how the next day felt; 'unknown' until reported
}
export interface ReviewRecord { recordedOn: string; by: string }   // actual readiness review (not just a date)
export interface AdviceRecord { recordedOn: string; adviceObtained: boolean; exerciseAllowed: 'yes' | 'restricted' | 'no'; restrictions: string }
export interface ProgState {
  review: ReviewRecord | null
  activatedOn: string | null
  step: Record<string, number>
  history: Entry[]
  lock: { since: string; reason: Sym } | null
  advice: AdviceRecord[]
  holds: Record<string, string>
  lastChange: Record<string, { day: string; from: number; to: number }>
  adviseAboutExercise?: Ex | null   // pain keeps coming back: show 'get medical advice about this exercise'
  lastAction: { day: string; ex: Ex; from: number; to: number } | null   // for visible revert
}
export const emptyProg = (): ProgState => ({ review: null, activatedOn: null, step: {}, history: [], lock: null, advice: [], holds: {}, lastChange: {}, lastAction: null })

export function recordFeedback(s: ProgState, e: Entry): ProgState {
  let lock = s.lock
  if (TIER1.includes(e.symptom) && !lock) lock = { since: e.day, reason: e.symptom }
  const holds = { ...s.holds }
  const history = [...s.history, e].slice(-90)
  if (e.symptom === 'pain' || e.symptom === 'illness') holds[e.ex] = e.day
  else if (holds[e.ex] && e.symptom === 'none') {
    const since = history.filter(h => h.ex === e.ex && h.day > holds[e.ex])
    if (since.length >= PAIN_FREE_TO_CLEAR && since.slice(-PAIN_FREE_TO_CLEAR).every(h => h.symptom === 'none')) delete holds[e.ex]
  }
  const painRepeats = history.filter(h => h.ex === e.ex && h.symptom === 'pain').length >= 2
  return { ...s, history, lock, holds, adviseAboutExercise: painRepeats ? e.ex : (s.adviseAboutExercise ?? null) }
}
export function recordReview(s: ProgState, r: ReviewRecord): ProgState { return { ...s, review: r } }
export function activate(s: ProgState, today: string): ProgState {
  if (!PROGRESSION_ENABLED || !s.review || today < s.review.recordedOn) return s
  return { ...s, activatedOn: today }
}
// Advice is recorded, never assumed. The lock lifts only if advice was obtained, exercise is not ruled out,
// and a reviewer has also confirmed (reviewed=true). No automatic clearance.
export function recordMedicalAdvice(s: ProgState, a: AdviceRecord, reviewed: boolean): ProgState {
  const advice = [...s.advice, a]
  if (a.adviceObtained && a.exerciseAllowed !== 'no' && reviewed) return { ...s, advice, lock: null }
  return { ...s, advice }
}
// Manual clear needs a reviewed gate. Holds also clear after two pain-free sessions (see recordFeedback).
export function clearHold(s: ProgState, ex: Ex, reviewed: boolean): ProgState {
  if (!reviewed) return s
  const holds = { ...s.holds }; delete holds[ex]
  return { ...s, holds }
}

function daysBetween(a: string, b: string): number { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000) }

// Only Easy qualifies. Medium and Hard reset the streak. Missed days never double anything.
export function nextChange(s: ProgState, today: string): { ex: Ex; from: number; to: number } | null {
  if (!PROGRESSION_ENABLED || !s.review || !s.activatedOn || s.lock) return null
  if (s.lastAction && s.lastAction.day === today) return null // one change per session
  for (const ex of Object.keys(LADDER) as Ex[]) {
    if (s.holds[ex]) continue
    const idx = s.step[ex] ?? 0
    if (idx >= LADDER[ex].length - 1) continue
    const lc = s.lastChange[ex]
    if (lc && daysBetween(lc.day, today) < MIN_DAYS_BETWEEN) continue
    const mine = s.history.filter(e => e.ex === ex && (!lc || e.day > lc.day))
    const last = mine.slice(-MIN_EASY_SESSIONS)
    if (last.length < MIN_EASY_SESSIONS) continue
    if (last.every(e => e.feel === 'easy' && e.symptom === 'none' && e.fullQuota && e.recoveryNextDay === 'ok')) return { ex, from: idx, to: idx + 1 }
  }
  return null
}
export function applyChange(s: ProgState, today: string): ProgState {
  const c = nextChange(s, today)
  if (!c) return s
  return { ...s, step: { ...s.step, [c.ex]: c.to }, lastChange: { ...s.lastChange, [c.ex]: { day: today, from: c.from, to: c.to } }, lastAction: { day: today, ...c } }
}
export function revertLast(s: ProgState): ProgState {
  const c = s.lastAction
  if (!c) return s
  const lastChange = { ...s.lastChange }; delete lastChange[c.ex]
  return { ...s, step: { ...s.step, [c.ex]: c.from }, lastChange, lastAction: null }
}
export function reps(s: ProgState, ex: Ex): number { return LADDER[ex][s.step[ex] ?? 0] }
// Visible status for the UI (to be wired after review).
export function status(s: ProgState): string {
  if (s.lock) return 'Progression is locked. Medical advice is needed first.'
  if (!PROGRESSION_ENABLED) return 'Automatic progression is off.'
  if (!s.review || !s.activatedOn) return 'Waiting for the readiness review.'
  return 'Progression is on. Changes are small and you can undo them.'
}

// Maps today's single feel/symptom answer onto the day's covered exercises. Conservative: fullQuota and
// next-day recovery are not collected yet, so entries are never eligible. This only records history and locks.
const EX_BY_NAME: [RegExp, Ex][] = [[/mini-squat/i, 'mini-squat'], [/bridge/i, 'bridge'], [/wall push-up/i, 'wall-push-up'], [/bird-dog/i, 'bird-dog'], [/calf raise/i, 'calf-raise']]
export function exercisesIn(moveNames: string[]): Ex[] {
  const out: Ex[] = []
  for (const n of moveNames) for (const [re, ex] of EX_BY_NAME) if (re.test(n) && !out.includes(ex)) out.push(ex)
  return out
}
export function recordDay(s: ProgState | undefined, day: string, feel: Feel3, symptom: 'pain' | 'dizziness' | 'breathing' | 'chest' | 'irregular-heartbeat' | 'none', moveNames: string[]): ProgState {
  let st = s ?? emptyProg()
  const exs = exercisesIn(moveNames)
  if (!exs.length) return st
  const sym: Sym = symptom
  // A symptom on the day is not tied to one exercise (the app asks once), so it applies to every move that day.
  for (const ex of exs) st = recordFeedback(st, { day, ex, feel, symptom: sym, fullQuota: false, recoveryNextDay: 'unknown' })
  return st
}

// Always-available safety report, any effort level, no XP, no extra steps for Easy/Medium. Locks programme-wide.
export function reportSymptom(s: ProgState | undefined, day: string, symptom: 'dizziness' | 'breathing' | 'chest' | 'irregular-heartbeat'): ProgState {
  const st = s ?? emptyProg()
  return st.lock ? st : { ...st, lock: { since: day, reason: symptom } }
}
