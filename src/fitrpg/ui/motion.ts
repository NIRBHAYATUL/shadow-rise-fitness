// Pure pose engine for the exercise demos. Units are metres; y is up, z is forward, x is the player's right.
// Each pose is built in 3D so the FRONT (x,y) and SIDE (z,y) views are always synchronized from one skeleton.
export type V = { x: number; y: number; z: number }
export type Skeleton = {
  head: V; neck: V; pelvis: V
  lS: V; rS: V; lE: V; rE: V; lH: V; rH: V
  lHip: V; rHip: V; lK: V; rK: V; lA: V; rA: V; lToe: V; rToe: V; lHeel: V; rHeel: V
  props?: { wall?: number; bottle?: boolean }
}
export type MotionId = 'room-walk' | 'mini-squat' | 'bridge' | 'wall-push-up' | 'bird-dog' | 'calf-raise' | 'bottle-curl' | 'cool-down'

const v = (x: number, y: number, z: number): V => ({ x, y, z })
const down = (p: V, a: number, L: number, x = p.x): V => v(x, p.y - L * Math.cos(a), p.z + L * Math.sin(a))
const up = (p: V, a: number, L: number, x = p.x): V => v(x, p.y + L * Math.cos(a), p.z + L * Math.sin(a))
const wave = (t: number) => 0.5 - 0.5 * Math.cos(2 * Math.PI * t) // smooth 0 → 1 → 0
const rad = (d: number) => (d * Math.PI) / 180
const T = 0.5, TH = 0.42, SH = 0.42, UA = 0.3, FA = 0.27, ANK = 0.08

function ik(p: V, target: V, L1: number, L2: number, pickHigher: boolean, x = p.x): V {
  const dz = target.z - p.z, dy = target.y - p.y
  const d = Math.min(Math.max(Math.hypot(dz, dy), 1e-6), L1 + L2 - 1e-6)
  const a = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))))
  const base = Math.atan2(dy, dz)
  const c = [base + a, base - a].map(b => v(x, p.y + L1 * Math.sin(b), p.z + L1 * Math.cos(b)))
  const [c0, c1] = c as [V, V]
  return (c0.y > c1.y) === pickHigher ? c0 : c1
}

function feet(a: V, toeOnFloor: boolean) {
  return { toe: v(a.x, toeOnFloor ? 0.02 : a.y - 0.06, a.z + 0.15), heel: v(a.x, a.y - 0.06, a.z - 0.05) }
}

type StandOpts = { trunk: number; lHip: number; lShin: number; rHip: number; rShin: number; lArm: number; lFore: number; rArm: number; rFore: number; rise?: number }
function stand(o: StandOpts): Skeleton {
  const pelvis = v(0, 0, 0)
  const neck = up(pelvis, o.trunk, T)
  const lS = { ...neck, x: -0.18 }, rS = { ...neck, x: 0.18 }
  const lHip = v(-0.1, 0, 0), rHip = v(0.1, 0, 0)
  const lK = down(lHip, o.lHip, TH), rK = down(rHip, o.rHip, TH)
  const lA = down(lK, o.lShin, SH), rA = down(rK, o.rShin, SH)
  const lE = down(lS, o.lArm, UA), rE = down(rS, o.rArm, UA)
  const lH = down(lE, o.lFore, FA), rH = down(rE, o.rFore, FA)
  const head = up(neck, o.trunk, 0.15)
  const stance = lA.y <= rA.y ? lA : rA
  const dy = ANK + (o.rise ?? 0) - stance.y, dz = -stance.z
  const pts = { head, neck, pelvis, lS, rS, lE, rE, lH, rH, lHip, rHip, lK, rK, lA, rA }
  const m = Object.fromEntries(Object.entries(pts).map(([k, p]) => [k, v(p.x, p.y + dy, p.z + dz)])) as Record<keyof typeof pts, V>
  const lf = feet(m.lA, (o.rise ?? 0) > 0 || m.lA.y < ANK + 0.02), rf = feet(m.rA, (o.rise ?? 0) > 0 || m.rA.y < ANK + 0.02)
  return { ...m, lToe: lf.toe, lHeel: lf.heel, rToe: rf.toe, rHeel: rf.heel }
}

function walk(t: number, amp: number): Skeleton {
  const s = Math.sin(2 * Math.PI * t)
  const lLift = Math.max(0, s) * amp, rLift = Math.max(0, -s) * amp
  return stand({ trunk: rad(2), lHip: lLift, lShin: lLift * 0.15, rHip: rLift, rShin: rLift * 0.15, lArm: -s * 0.35 * amp * 1.4, lFore: -s * 0.35 * amp * 1.4 + 0.35, rArm: s * 0.35 * amp * 1.4, rFore: s * 0.35 * amp * 1.4 + 0.35 })
}

function bridge(t: number): Skeleton {
  const s = wave(t)
  const neck = v(0, 0.1, -0.55)
  const py = 0.13 + 0.27 * s
  const pelvis = v(0, py, neck.z + Math.sqrt(T * T - (py - neck.y) ** 2))
  const mk = (x: number) => {
    const hip = { ...pelvis, x }, a = v(x, ANK, 0.42)
    return { hip, k: ik(hip, a, TH, SH, true, x), a }
  }
  const L = mk(-0.1), R = mk(0.1)
  const arm = (x: number) => ({ s: { ...neck, x }, e: v(x, 0.05, neck.z + 0.28), h: v(x, 0.04, neck.z + 0.54) })
  const la = arm(-0.2), ra = arm(0.2)
  const lf = feet(L.a, true), rf = feet(R.a, true)
  return { head: v(0, 0.11, neck.z - 0.15), neck, pelvis, lS: la.s, rS: ra.s, lE: la.e, rE: ra.e, lH: la.h, rH: ra.h, lHip: L.hip, rHip: R.hip, lK: L.k, rK: R.k, lA: L.a, rA: R.a, lToe: lf.toe, rToe: rf.toe, lHeel: lf.heel, rHeel: rf.heel }
}

const WALL = 1.12
function wallPush(t: number): Skeleton {
  const s = wave(t)
  const th = rad(25 + 12 * s)
  const ankle = v(0, ANK, 0)
  const dir = { y: Math.cos(th), z: Math.sin(th) }
  const at = (L: number, x: number) => v(x, ankle.y + dir.y * L, ankle.z + dir.z * L)
  const neck = at(1.34, 0), pelvis = at(0.84, 0)
  const lS = at(1.34, -0.18), rS = at(1.34, 0.18)
  const lHand = v(-0.25, 1.28, WALL - 0.02), rHand = v(0.25, 1.28, WALL - 0.02)
  const lE = ik(lS, lHand, UA, FA, false, -0.24), rE = ik(rS, rHand, UA, FA, false, 0.24)
  const lA = { ...ankle, x: -0.1 }, rA = { ...ankle, x: 0.1 }
  const lf = feet(lA, true), rf = feet(rA, true)
  return { head: at(1.49, 0), neck, pelvis, lS, rS, lE, rE, lH: lHand, rH: rHand, lHip: at(0.84, -0.1), rHip: at(0.84, 0.1), lK: at(0.42, -0.1), rK: at(0.42, 0.1), lA, rA, lToe: lf.toe, rToe: rf.toe, lHeel: lf.heel, rHeel: rf.heel, props: { wall: WALL } }
}

export const BIRD_DOG_ORDER = ['right arm', 'left arm', 'right leg', 'left leg'] as const
export function birdDogPhase(t: number) {
  const u = ((t % 1) + 1) % 1
  const seg = Math.min(3, Math.floor(u * 4))
  return { limb: BIRD_DOG_ORDER[seg] as typeof BIRD_DOG_ORDER[number], lift: wave(u * 4 - seg) }
}
function birdDog(t: number): Skeleton {
  const { limb, lift } = birdDogPhase(t)
  const pelvis = v(0, 0.45, 0), neck = v(0, 0.6, 0.48)
  const arm = (x: number, raised: boolean) => {
    const s = { ...neck, x }, a = raised ? lift * rad(85) : 0
    const e = down(s, a, UA), h = down(e, a, FA)
    return { s, e, h }
  }
  const leg = (x: number, raised: boolean) => {
    const hip = { ...pelvis, x }, a = raised ? -lift * rad(88) : 0
    const k = down(hip, a, TH), an = down(k, -Math.PI / 2, SH)
    return { hip, k, an }
  }
  const la = arm(-0.18, limb === 'left arm'), ra = arm(0.18, limb === 'right arm')
  const ll = leg(-0.1, limb === 'left leg'), rl = leg(0.1, limb === 'right leg')
  const ft = (a: V) => ({ toe: v(a.x, a.y - 0.02, a.z - 0.12), heel: v(a.x, a.y + 0.04, a.z + 0.02) })
  const lf = ft(ll.an), rf = ft(rl.an)
  return { head: v(0, 0.64, 0.64), neck, pelvis, lS: la.s, rS: ra.s, lE: la.e, rE: ra.e, lH: la.h, rH: ra.h, lHip: ll.hip, rHip: rl.hip, lK: ll.k, rK: rl.k, lA: ll.an, rA: rl.an, lToe: lf.toe, rToe: rf.toe, lHeel: lf.heel, rHeel: rf.heel }
}

export function pose(id: MotionId, t: number): Skeleton {
  switch (id) {
    case 'room-walk': return walk(t, rad(45))
    case 'cool-down': return walk(t, rad(22))
    case 'mini-squat': { const s = wave(t); return stand({ trunk: rad(18 * s), lHip: rad(48 * s), lShin: rad(22 * s), rHip: rad(48 * s), rShin: rad(22 * s), lArm: rad(70 * s), lFore: rad(75 * s), rArm: rad(70 * s), rFore: rad(75 * s) }) }
    case 'calf-raise': { const s = wave(t); return { ...stand({ trunk: 0, lHip: 0, lShin: 0, rHip: 0, rShin: 0, lArm: rad(40), lFore: rad(85), rArm: rad(40), rFore: rad(85), rise: 0.07 * s }), props: { wall: 0.62 } } }
    case 'bottle-curl': { const s = wave(t); const f = rad(5 + 125 * s); return { ...stand({ trunk: 0, lHip: 0, lShin: 0, rHip: 0, rShin: 0, lArm: rad(3), lFore: f, rArm: rad(3), rFore: f }), props: { bottle: true } } }
    case 'bridge': return bridge(t)
    case 'wall-push-up': return wallPush(t)
    case 'bird-dog': return birdDog(t)
  }
}

const angleAt = (a: V, b: V, c: V) => {
  const u = { y: a.y - b.y, z: a.z - b.z }, w = { y: c.y - b.y, z: c.z - b.z }
  return Math.round((Math.acos((u.y * w.y + u.z * w.z) / (Math.hypot(u.y, u.z) * Math.hypot(w.y, w.z))) * 180) / Math.PI)
}
export function annotation(id: MotionId, t: number): string {
  const p = pose(id, t)
  switch (id) {
    case 'mini-squat': return `Knee angle now ${angleAt(p.rHip, p.rK, p.rA)}° — no fixed target; stay in your pain-free range`
    case 'bridge': return `Shoulder–hip–knee line ${angleAt(p.neck, p.pelvis, p.rK)}° (180° = straight)`
    case 'wall-push-up': return `Elbow angle ${angleAt(p.rS, p.rE, p.rH)}° · body stays one straight line`
    case 'bird-dog': return `Moving now: ${birdDogPhase(t).limb} only — the other three stay down`
    case 'calf-raise': return `Heels lifted ${Math.round((p.rA.y - ANK) * 100)} cm · toes stay on the floor`
    case 'bottle-curl': return `Elbow angle ${angleAt(p.rS, p.rE, p.rH)}° · upper arm stays still`
    default: return `Knee lift ${Math.round(Math.max(p.lK.y, p.rK.y) * 100 - 50)} cm above standing · upright posture`
  }
}
export const CYCLE_SECONDS: Record<MotionId, number> = { 'room-walk': 2.4, 'cool-down': 3.6, 'mini-squat': 4, bridge: 4.5, 'wall-push-up': 4, 'bird-dog': 12, 'calf-raise': 3.5, 'bottle-curl': 4 }
