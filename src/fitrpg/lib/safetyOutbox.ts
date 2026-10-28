// A safety flag (programme lock or exercise hold) reported on this device must never be lost because
// another device saved first. Flags are kept in a small local outbox until the server confirms them,
// merged into the latest server state (only ever adding, never clearing), and re-saved.
import type { Backend, Session } from './store'
import type { Progress } from './game'
import { normalizeProg } from './progression'
export interface Pending { lock: unknown; holds: Record<string, unknown> }
// Keyed by the auth user id, never by display name, so an outbox belongs to exactly one account.
const key = (uid: string) => `srf-safety:uid:${uid}`
const legacyKey = (username: string) => `srf-safety:${username}`
const ls = () => { try { return globalThis.localStorage } catch { return undefined } }
export function readPending(u: string | undefined): Pending | null {
  if (!u) return null
  try { const raw = ls()?.getItem(key(u)); if (!raw) return null; const p = JSON.parse(raw); return p && typeof p === 'object' ? { lock: p.lock ?? null, holds: p.holds && typeof p.holds === 'object' ? p.holds : {} } : null } catch { return null }
}
export function clearPending(u: string | undefined) { if (!u) return; try { ls()?.removeItem(key(u)) } catch {} }
// Remember any lock/hold present in the state about to be saved. Merges with what is already pending.
export function recordPending(u: string | undefined, pr: Progress) {
  if (!u) return
  const prog = pr.prog as any
  const hasHolds = prog?.holds && typeof prog.holds === 'object' && Object.keys(prog.holds).length > 0
  if (!prog?.lock && !hasHolds) return
  const old = readPending(u)
  const next: Pending = { lock: old?.lock ?? prog.lock ?? null, holds: { ...(prog.holds ?? {}), ...(old?.holds ?? {}) } }
  try { ls()?.setItem(key(u), JSON.stringify(next)) } catch {}
}
// Only adds: an existing lock or hold always wins, nothing is removed.
export function mergeSafety(pr: Progress, pending: Pending | null): Progress {
  if (!pending || (!pending.lock && Object.keys(pending.holds).length === 0)) return pr
  const base = normalizeProg(pr.prog) ?? normalizeProg({})!
  return { ...pr, prog: { ...base, lock: base.lock ?? (pending.lock as any) ?? null, holds: { ...pending.holds, ...base.holds } as any } }
}
// An older build stored the outbox under the username. The signed-in session proves this username belongs to
// this auth uid (sign-in address = username), so that entry moves to the uid key. It is never dropped or reassigned.
export function migrateLegacy(s: Session) {
  if (!s.uid) return
  try {
    const raw = ls()?.getItem(legacyKey(s.username)); if (!raw) return
    const old = JSON.parse(raw); const cur = readPending(s.uid)
    const next: Pending = { lock: cur?.lock ?? old.lock ?? null, holds: { ...(old.holds ?? {}), ...(cur?.holds ?? {}) } }
    ls()?.setItem(key(s.uid), JSON.stringify(next)); ls()?.removeItem(legacyKey(s.username))
  } catch {}
}
export const withPending = (s: Session): Session => { migrateLegacy(s); return { ...s, progress: mergeSafety(s.progress, readPending(s.uid)) } }
// Reload the latest server state, add the pending flags, save. Stale XP or other edits are not replayed.
export async function reconcileSafety(b: Backend, uid: string, username: string, attempts = 3): Promise<{ ok: boolean; session?: Session }> {
  for (let i = 0; i < attempts; i++) {
    try {
      const pending = readPending(uid); if (!pending) return { ok: true }
      const fresh = await b.restore(); if (!fresh || fresh.username !== username || fresh.uid !== uid) return { ok: false }
      const merged = { ...fresh, progress: mergeSafety(fresh.progress, pending) }
      const saved = await b.save(username, { progress: merged.progress })
      clearPending(uid)
      return { ok: true, session: saved && saved.progress ? { ...merged, progress: saved.progress } : merged }
    } catch (e: any) { if (!String(e?.message).includes('Progress changed on another device')) return { ok: false } }
  }
  return { ok: false }
}
