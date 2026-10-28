// Week 1 only (27 Oct to 1 Nov 2026), from the trainer's plan. Nothing is prescribed after 1 Nov 2026.
export const PLAN_START = '2026-10-27'
export type Move = [string, string]
const W: Move = ['Warm-up: room walk', '5 min']
const REST: Move = ['Rest between moves', '60 to 90 s or more']
const CD: Move = ['Cool-down: slow walk', '2 min']
const SET: Move = ['Exactly 1 set each. Keep 2 to 3 good reps in reserve. Drop 5 to 3 if hard. Floor moves optional if getting down is uncomfortable.', '']
const BIRD: Move = ['Easy bird-dog, each arm and each leg separately', '3 each']
export interface DayPlan { kind: 'before' | 'train' | 'rest' | 'none'; label: string; moves: Move[] }
const PLAN: Record<string, DayPlan> = {
  '2026-10-27': { kind: 'train', label: 'Legs', moves: [W, ['Mini-squat', '5'], ['Bridge', '5'], ['Wall push-up', '5'], BIRD, ['Optional: calf raise', '5'], REST, CD, SET] },
  '2026-10-28': { kind: 'train', label: 'Room walk', moves: [['Room walk or march, short blocks are fine', '5 to 10 min']] },
  '2026-10-29': { kind: 'train', label: 'Chest and arms', moves: [W, ['Wall push-up', '5'], ['Mini-squat', '5'], ['Bridge', '5'], ['Single-limb bird-dog', '3 each'], ['Optional: plastic bottle curl', '5 each arm'], REST, CD, SET] },
  '2026-10-30': { kind: 'train', label: 'Easy walk or full rest', moves: [['Easy walk, or full rest if tired or sore', '5 to 10 min']] },
  '2026-10-31': { kind: 'train', label: 'Back and core', moves: [W, ['Single-limb bird-dog', '3 each'], ['Bridge', '5'], ['Wall push-up', '5'], ['Mini-squat', '5'], REST, CD, SET] },
  '2026-11-01': { kind: 'rest', label: 'Rest day (gentle movement optional)', moves: [] },
}
export function dayPlan(day: string): DayPlan {
  if (day < PLAN_START) return { kind: 'before', label: 'Plan starts Tue 27 Oct', moves: [] }
  if (PLAN[day]) return PLAN[day]
  // After 1 Nov 2026: repeat the week-1 baseline unchanged (no increases). The 2 Nov readiness review is still pending.
  const wd = new Date(day + 'T00:00:00Z').getUTCDay() // 0 Sun .. 6 Sat
  const core = (opt: Move): Move[] => [W, ['Mini-squat', '5'], ['Bridge', '5'], ['Wall push-up', '5'], BIRD, opt, REST, CD, SET]
  if (wd === 2) return { kind: 'train', label: 'Legs (baseline repeat)', moves: core(['Optional: calf raise', '5']) }
  if (wd === 4) return { kind: 'train', label: 'Chest and arms (baseline repeat)', moves: core(['Optional: plastic bottle curl', '5 each arm']) }
  if (wd === 6) return { kind: 'train', label: 'Back and core (baseline repeat)', moves: core(['Optional: none', '']).filter(m => m[0] !== 'Optional: none') }
  if (wd === 3 || wd === 5) return { kind: 'train', label: 'Easy walk (baseline repeat)', moves: [['Easy walk, 5 to 10 min, may be 2 to 3 short parts. Full rest if in pain or unusually tired.', '5 to 10 min']] }
  if (wd === 0) return { kind: 'rest', label: 'Rest day', moves: [] }
  return { kind: 'none', label: 'No prescribed workout. Readiness review pending.', moves: [] }
}
