// A safety flag (programme lock or exercise hold) reported on this device must never be lost because
// another device saved first. Flags are kept in a small local outbox until the server confirms them,
// merged into the latest server state (only ever adding, never clearing), and re-saved.
import type { Backend, Session } from './store'
import type { Progress } from './game'
import { normalizeProg } from './progression'
export interface Pending { lock: unknown; holds: Record<string, unknown> }
const key = (u: string) => `srf-safety:${u}`
const ls = () => { try { return globalThis.localStorage } catch { return undefined } }
export function readPending(u: string): Pending | null {
  try { const raw = ls()?.getItem(key(u)); if (!raw) return null; const p = JSON.parse(raw); return p && typeof p === 'object' ? { lock: p.lock ?? null, holds: p.holds && typeof p.holds === 'object' ? p.holds : {} } : null } catch { return null }
}
export function clearPending(u: string) { try { ls()?.removeItem(key(u)) } catch {} }
// Remember any lock/hold present in the state about to be saved. Merges with what is already pending.
export function recordPending(u: string, pr: Progress) {
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
export const withPending = (s: Session): Session => ({ ...s, progress: mergeSafety(s.progress, readPending(s.username)) })
// Reload the latest server state, add the pending flags, save. Stale XP or other edits are not replayed.
export async function reconcileSafety(b: Backend, username: string, attempts = 3): Promise<{ ok: boolean; session?: Session }> {
  for (let i = 0; i < attempts; i++) {
    try {
      const pending = readPending(username); if (!pending) return { ok: true }
      const fresh = await b.restore(); if (!fresh || fresh.username !== username) return { ok: false }
      const merged = { ...fresh, progress: mergeSafety(fresh.progress, pending) }
      const saved = await b.save(username, { progress: merged.progress })
      clearPending(username)
      return { ok: true, session: saved && saved.progress ? { ...merged, progress: saved.progress } : merged }
    } catch (e: any) { if (!String(e?.message).includes('Progress changed on another device')) return { ok: false } }
  }
  return { ok: false }
}
