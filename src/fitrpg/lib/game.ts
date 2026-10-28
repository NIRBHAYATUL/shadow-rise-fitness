// Game rules. Cosmetic only: XP and stages never measure fitness or readiness.
export type Feel = 'easy' | 'medium' | 'hard'
export type Symptom = 'pain' | 'dizziness' | 'breathing' | 'chest' | 'irregular-heartbeat' | 'none'
export const XP_PER_QUEST = 100 // same for Easy, Medium, Hard
export const XP_CHECKIN = 20
export const XP_REST = 30
export const MAX_LEVEL = 100

export function xpForLevel(level: number): number { return 60 + (level - 1) * 6 }
export function levelFromXp(total: number): { level: number; into: number; need: number } {
  let level = 1, left = Math.max(0, Math.floor(total))
  while (level < MAX_LEVEL && left >= xpForLevel(level)) { left -= xpForLevel(level); level++ }
  return { level, into: left, need: xpForLevel(level) }
}
export function validUsername(u: string): boolean { return /^[a-z0-9_]{3,20}$/.test(u) }
export function validPassword(p: string): boolean { return p.length >= 8 && p.length <= 72 }
// Only Hard opens the symptom step. Any symptom = no increase suggestion.
export function needsSymptomStep(f: Feel): boolean { return f === 'hard' }
export function suggestIncrease(f: Feel, s: Symptom | null): boolean { return f === 'hard' && s === 'none' }

export interface Pending { day: string; feel?: Feel; symptom?: Symptom }
export interface Sess { day: string; seconds: number }
export interface Progress { xp: number; doneDays: string[]; pending: Pending | null; title?: string; sessions?: Sess[]; sets?: Record<string, number>; prog?: import('./progression').ProgState; future?: import('./futureProgression').FutureState }
export const emptyProgress = (): Progress => ({ xp: 0, doneDays: [], pending: null })

// Awarding is idempotent per day: a refresh or double tap never doubles XP.
export function complete(p: Progress, day: string, feel: Feel, symptom: Symptom | null): Progress {
  if (p.doneDays.includes(day) || p.doneDays.includes('rest:' + day)) return { ...p, pending: null }
  if (needsSymptomStep(feel) && !symptom) return p // compulsory second step
  return { ...p, xp: p.xp + XP_PER_QUEST + XP_CHECKIN, doneDays: [...p.doneDays, day], pending: null }
}
export function rest(p: Progress, day: string): Progress {
  const key = 'rest:' + day
  if (p.doneDays.includes(key) || p.doneDays.includes(day)) return p
  return { ...p, xp: p.xp + XP_REST, doneDays: [...p.doneDays, key] }
}
export function startPending(p: Progress, day: string): Progress { return { ...p, pending: { day } } }
export function addSession(p: Progress, day: string, seconds: number): Progress {
  if (seconds < 5) return p
  return { ...p, sessions: [...(p.sessions ?? []), { day, seconds: Math.round(seconds) }].slice(-60) }
}
export function setSets(p: Progress, day: string, n: number): Progress {
  return { ...p, sets: { ...(p.sets ?? {}), [day]: Math.max(0, Math.min(99, n)) } }
}
