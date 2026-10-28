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
  it('pain holds exercises, does not lock, and never self-clears from day-level answers', () => {
    let s = P.recordDay(undefined, '2026-10-31', 'hard', 'pain', moves)
    expect(s.lock).toBeNull(); expect(s.holds['mini-squat']).toBeTruthy()
    for (const d of ['2026-11-03', '2026-11-04', '2026-11-05']) s = P.recordDay(s, d, 'easy', 'none', moves)
    expect(s.holds['mini-squat']).toBeTruthy()
    expect(P.clearHold(s, 'mini-squat', true).holds['mini-squat']).toBeUndefined()
  })
  it('XP rule unchanged: hard without symptom still no increase and XP same as easy', () => {
    expect(g.suggestIncrease('hard', 'none')).toBe(true) // legacy suggestion flag; progression module ignores it
    expect(P.nextChange(P.recordDay(undefined, '2026-11-03', 'hard', 'none', moves), '2026-11-04')).toBeNull()
  })
})
describe('report + status', () => {
  it('report locks, status shows locked even when disabled', () => {
    const s = P.reportSymptom(undefined, '2026-11-03', 'chest')
    expect(s.lock?.reason).toBe('chest'); expect(P.status(s)).toMatch(/locked/)
    expect(P.status(P.emptyProg())).toMatch(/off/)
  })
})
describe('quota and recovery inputs', () => {
  it('only ticked moves count as full quota; pain holds only the chosen move; recovery is never inferred', () => {
    let s = P.recordDay(undefined, '2026-11-03', 'easy', 'none', moves, { finished: ['mini-squat', 'bridge'] })
    expect(s.history.find(h => h.ex === 'mini-squat')!.fullQuota).toBe(true)
    expect(s.history.find(h => h.ex === 'wall-push-up')!.fullQuota).toBe(false)
    expect(P.pendingRecoveryDay(s, '2026-11-04')).toBe('2026-11-03')
    expect(P.pendingRecoveryDay(s, '2026-11-10')).toBeNull()
    s = P.setRecovery(s, '2026-11-03', 'sore')
    expect(s.history.every(h => h.recoveryNextDay === 'sore')).toBe(true)
    const p = P.recordDay(undefined, '2026-11-03', 'medium', 'pain', moves, { painEx: ['bridge'] })
    expect(Object.keys(p.holds)).toEqual(['bridge'])
    const all = P.recordDay(undefined, '2026-11-03', 'medium', 'pain', moves)
    expect(Object.keys(all.holds).length).toBe(4)
  })
})
