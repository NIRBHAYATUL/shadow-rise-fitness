import { describe, it, expect } from 'vitest'
import { dayPlan, reviewedDayPlan } from './plan'
describe('baseline after 1 Nov', () => {
  it('Mon not prescribed, Tue/Thu/Sat core, Wed/Fri walk, Sun rest, week 1 untouched', () => {
    expect(dayPlan('2026-11-02').kind).toBe('none'); expect(dayPlan('2026-11-02').label).toMatch(/No prescribed workout/)
    for (const d of ['2026-11-03', '2026-11-05', '2026-11-07']) expect(dayPlan(d).moves.some(m => m[0] === 'Mini-squat' && m[1] === '5')).toBe(true)
    for (const d of ['2026-11-04', '2026-11-06']) expect(dayPlan(d).label).toMatch(/walk/i)
    expect(dayPlan('2026-11-08').kind).toBe('rest')
    expect(dayPlan('2026-10-29').label).toBe('Chest and arms')
  })
})

describe('dormant reviewed plan wiring',()=>{it('keeps every baseline day identical even with a fabricated selected future state',()=>{for(const d of ['2026-10-27','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-07','2026-11-08'])expect(reviewedDayPlan(d,{review:{effectiveFrom:'2026-11-03',secondSetsSelected:true,selectedCore:['bridge']},dose:{bridge:[12,12]},optedOut:false} as any)).toEqual(dayPlan(d))})})
