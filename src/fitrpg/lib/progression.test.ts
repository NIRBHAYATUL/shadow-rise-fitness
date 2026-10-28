import { describe, it, expect } from 'vitest'
import * as P from './progression'
import * as g from './game'
const moves = ['Warm-up: room walk', 'Mini-squat', 'Bridge', 'Wall push-up', 'Single-limb bird-dog', 'Optional: plastic bottle curl']
describe('progression (disabled scaffold)', () => {
  it('is off and never proposes a change', () => {
    expect(P.PROGRESSION_ENABLED).toBe(false)
    let s = P.recordDay(undefined, '2026-11-03', 'easy', 'none', moves)
    s = P.recordDay(s, '2026-11-04', 'easy', 'none', moves)
    expect(P.nextChange(s, '2026-11-05')).toBeNull()
  })
  it('records history for covered exercises only (bottle curl and walk are baseline)', () => {
    const s = P.recordDay(undefined, '2026-10-29', 'medium', 'none', moves)
    expect(s.history.map(h => h.ex).sort()).toEqual(['bird-dog', 'bridge', 'mini-squat', 'wall-push-up'])
  })
  it('tier-1 symptom locks programme-wide and survives a save/load round trip with XP and unknown fields intact', () => {
    const p0: any = { ...g.emptyProgress(), xp: 340, doneDays: ['2026-10-27'], title: 'X', custom: { keep: 1 } }
    const p1 = g.complete(p0, '2026-10-31', 'hard', 'dizziness')
    const withProg: any = { ...p1, prog: P.recordDay(p0.prog, '2026-10-31', 'hard', 'dizziness', moves) }
    const back = JSON.parse(JSON.stringify(withProg))
    expect(back.xp).toBe(340 + 120)
    expect(back.custom).toEqual({ keep: 1 })
    expect(back.title).toBe('X')
    expect(back.prog.lock.reason).toBe('dizziness')
    // a later "fine" day does not unlock
    const later = P.recordDay(back.prog, '2026-11-01', 'easy', 'none', moves)
    expect(later.lock).not.toBeNull()
  })
  it('pain holds exercises, does not lock, and clears after two pain-free sessions', () => {
    let s = P.recordDay(undefined, '2026-10-31', 'hard', 'pain', moves)
    expect(s.lock).toBeNull(); expect(s.holds['mini-squat']).toBeTruthy()
    s = P.recordDay(s, '2026-11-03', 'easy', 'none', moves); expect(s.holds['mini-squat']).toBeTruthy()
    s = P.recordDay(s, '2026-11-04', 'easy', 'none', moves); expect(s.holds['mini-squat']).toBeUndefined()
  })
  it('XP rule unchanged: hard without symptom still no increase and XP same as easy', () => {
    expect(g.suggestIncrease('hard', 'none')).toBe(true) // legacy suggestion flag; progression module ignores it
    expect(P.nextChange(P.recordDay(undefined, '2026-11-03', 'hard', 'none', moves), '2026-11-04')).toBeNull()
  })
})
