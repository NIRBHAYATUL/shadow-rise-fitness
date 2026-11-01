import { describe, expect, it } from 'vitest'
import { emptyProgress } from '../lib/game'
import { emptyProg } from '../lib/progression'
import { confirmTarget } from './coreRules'

describe('confirmed cosmetic completion', () => {
  it('requires feedback before XP', () => { expect(confirmTarget(emptyProgress(), '2026-11-03', null).xp).toBe(0) })
  it.each(['easy', 'medium', 'hard'] as const)('awards 120 XP for confirmed %s without a symptom questionnaire', feel => {
    expect(confirmTarget(emptyProgress(), '2026-11-03', feel).xp).toBe(120)
  })
  it('protects against duplicate completion and rest-day awards', () => {
    const once = confirmTarget(emptyProgress(), '2026-11-03', 'hard')
    expect(confirmTarget(once, '2026-11-03', 'easy').xp).toBe(120)
    expect(confirmTarget({ ...emptyProgress(), doneDays: ['rest:2026-11-03'] }, '2026-11-03', 'easy').xp).toBe(0)
  })
  it('blocks locked players and retains their safety state', () => {
    const p = { ...emptyProgress(), prog: { ...emptyProg(), lock: { since: '2026-10-29', reason: 'chest' as const } } }
    expect(confirmTarget(p, '2026-11-03', 'easy')).toBe(p)
  })
  it('preserves holds, review and future state without progression', () => {
    const p = { ...emptyProgress(), prog: { ...emptyProg(), holds: { bridge: '2026-10-29' }, review: { recordedOn: '2026-10-29', by: 'reviewer' } } }
    expect(confirmTarget(p, '2026-11-03', 'hard').prog).toBe(p.prog)
  })
  it('does not prescribe Monday or train on Sunday', () => {
    expect(confirmTarget(emptyProgress(), '2026-11-02', 'easy').xp).toBe(0)
    expect(confirmTarget(emptyProgress(), '2026-11-01', 'easy').xp).toBe(0)
  })
  it('does not discard an existing pending health flag', () => {
    const p = { ...emptyProgress(), pending: { day: '2026-10-29', symptom: 'pain' as const } }
    expect(confirmTarget(p, '2026-11-03', 'easy')).toBe(p)
  })
})