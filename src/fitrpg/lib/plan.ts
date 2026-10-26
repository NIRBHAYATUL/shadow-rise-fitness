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
  return PLAN[day] ?? { kind: 'none', label: 'Next plan pending', moves: [] }
}
