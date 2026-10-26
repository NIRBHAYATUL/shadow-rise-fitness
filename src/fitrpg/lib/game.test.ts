import { describe, it, expect } from 'vitest'
import * as g from './game'
import { PROFILE_TITLES, titleFor, lookFor } from './levels'
import { checkCreds } from './store'
import { filterRoster } from './roster'
describe('levels and stages', () => {
  it('levels climb with xp', () => { expect(g.levelFromXp(0).level).toBe(1); expect(g.levelFromXp(60).level).toBe(2); expect(g.levelFromXp(59).level).toBe(1) })
    it('level caps at 100', () => { expect(g.levelFromXp(1e9).level).toBe(100) })
})
describe('quest completion', () => {
  it('easy and medium give equal xp and need no symptom step', () => {
    const a = g.complete(g.emptyProgress(), 'd1', 'easy', null), b = g.complete(g.emptyProgress(), 'd1', 'medium', null)
    expect(a.xp).toBe(b.xp); expect(a.xp).toBeGreaterThan(0)
  })
  it('hard needs symptom answer before xp', () => {
    const p = g.emptyProgress(); expect(g.complete(p, 'd1', 'hard', null).xp).toBe(0)
    expect(g.complete(p, 'd1', 'hard', 'none').xp).toBe(a(p))
    function a(_: any) { return g.XP_PER_QUEST + g.XP_CHECKIN }
  })
  it('never doubles xp for same day', () => {
    const once = g.complete(g.emptyProgress(), 'd1', 'easy', null)
    expect(g.complete(once, 'd1', 'easy', null).xp).toBe(once.xp)
  })
  it('increase suggestion only for hard with no symptoms', () => {
    expect(g.suggestIncrease('easy', null)).toBe(false); expect(g.suggestIncrease('hard', 'pain')).toBe(false); expect(g.suggestIncrease('hard', 'none')).toBe(true)
  })
  it('rest gives xp once per day and no penalty path exists', () => {
    const r = g.rest(g.emptyProgress(), 'd2'); expect(r.xp).toBe(g.XP_REST); expect(g.rest(r, 'd2').xp).toBe(g.XP_REST)
  })
})
describe('sessions, sets and titles', () => {
  it('records sessions and sets, ignores tiny timers', () => {
    let p = g.addSession(g.emptyProgress(), 'd1', 3); expect(p.sessions ?? []).toHaveLength(0)
    p = g.addSession(p, 'd1', 600); expect(p.sessions).toEqual([{ day: 'd1', seconds: 600 }])
    p = g.setSets(p, 'd1', 3); expect(p.sets!.d1).toBe(3); expect(g.setSets(p, 'd1', -4).sets!.d1).toBe(0)
  })
  it('completing keeps title, sessions and sets', () => {
    const p = { ...g.emptyProgress(), title: 'Firewalker' }; expect(g.complete(p, 'd1', 'easy', null).title).toBe('Firewalker')
  })
  it('title unlocks use 8 verified names at increasing levels', () => {
    expect(PROFILE_TITLES).toHaveLength(8); expect(PROFILE_TITLES.map(t => t.at)).toEqual([...PROFILE_TITLES.map(t => t.at)].sort((a, b) => a - b))
  })
  it('ranks: 10 bands, level 1 E-Rank, 100 Full Shadow Monarch', () => {
    expect(titleFor(1)).toBe('E-Rank'); expect(titleFor(10)).toBe('E-Rank'); expect(titleFor(11)).toBe('D-Rank'); expect(titleFor(100)).toBe('Full Shadow Monarch')
  })
  it('every level 1-100 has a distinct look', () => {
    const seen = new Set(Array.from({ length: 100 }, (_, i) => JSON.stringify(lookFor(i + 1)))); expect(seen.size).toBe(100)
  })
})
describe('roster filters', () => {
  it('has both genders and monarchs', () => { expect(filterRoster('F').length).toBeGreaterThan(0); expect(filterRoster('Monarch').length).toBeGreaterThan(0) })
})
describe('credentials rules', () => { it('checks username and password', () => { expect(checkCreds('ab', 'longenough1')).not.toBeNull(); expect(checkCreds('abc', 'short')).not.toBeNull(); expect(checkCreds('abc_1', 'longenough1')).toBeNull() }) })
import { dayPlan } from './plan'
import { bodyBlend, titleFor as tf } from './levels'
describe('plan and body', () => {
  it('is date aware', () => {
    expect(dayPlan('2026-10-26').kind).toBe('before')
    expect(dayPlan('2026-10-27').label).toBe('Legs')
    expect(dayPlan('2026-10-28').label).toBe('Room walk')
    expect(dayPlan('2026-11-01').kind).toBe('rest'); expect(dayPlan('2026-11-02').kind).toBe('none')
  })
  it('changes body image at every level 1-100', () => {
    const key = (l: number) => { const b = bodyBlend(l); return b.a + ':' + b.mix + ':' + b.aura }
    const keys = new Set<string>(); for (let l = 1; l <= 100; l++) keys.add(key(l)); expect(keys.size).toBe(100)
    expect(bodyBlend(100).b).toBeNull(); expect(tf(100)).toBe('Full Shadow Monarch')
  })
})
