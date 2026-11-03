import { describe, expect, it } from 'vitest'
import { birdDogPhase, pose, type MotionId } from './motion'

const ts = Array.from({ length: 41 }, (_, i) => i / 40)
describe('exercise motion form', () => {
  it('mini-squat keeps both feet grounded and fixed through the whole loop', () => {
    for (const t of ts) { const p = pose('mini-squat', t); expect(p.lA.y).toBeCloseTo(0.08, 5); expect(p.rA.z).toBeCloseTo(0, 5); expect(p.lToe.y).toBeCloseTo(0.02, 5) }
  })
  it('bird-dog raises one limb at a time, never a diagonal pair', () => {
    for (const t of ts) {
      const p = pose('bird-dog', t)
      const raised = [p.lH.y > 0.1, p.rH.y > 0.1, p.lK.y > 0.1, p.rK.y > 0.1].filter(Boolean).length
      expect(raised).toBeLessThanOrEqual(1)
    }
    expect(new Set(ts.map(t => birdDogPhase(t).limb)).size).toBe(4)
  })
  it('wall push-up keeps hands on the wall and feet on the floor', () => {
    for (const t of ts) { const p = pose('wall-push-up', t); expect(p.rH.z).toBeCloseTo(1.1, 5); expect(p.rA.y).toBeCloseTo(0.08, 5) }
  })
  it('bridge keeps shoulders and feet on the floor while hips rise', () => {
    expect(pose('bridge', 0.5).pelvis.y).toBeGreaterThan(pose('bridge', 0).pelvis.y + 0.2)
    for (const t of ts) { const p = pose('bridge', t); expect(p.neck.y).toBeCloseTo(0.1, 5); expect(p.rA.y).toBeCloseTo(0.08, 5) }
  })
  it('every exercise has a distinct movement, not one shared animation', () => {
    const ids: MotionId[] = ['room-walk', 'mini-squat', 'bridge', 'wall-push-up', 'bird-dog', 'calf-raise', 'bottle-curl', 'cool-down']
    const sigs = ids.map(id => JSON.stringify(pose(id, 0.3)))
    expect(new Set(sigs).size).toBe(ids.length)
  })
})
