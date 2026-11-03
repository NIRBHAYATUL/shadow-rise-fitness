import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { annotation, CYCLE_SECONDS, pose, type MotionId, type Skeleton, type V } from './motion'

type Proj = (p: V) => [number, number]
const front: Proj = p => [p.x, -p.y]
const side: Proj = p => [p.z, -p.y]

function Figure({ s, proj, sideView }: { s: Skeleton; proj: Proj; sideView: boolean }) {
  const L = (a: V, b: V, cls: string) => { const [x1, y1] = proj(a), [x2, y2] = proj(b); return <line x1={x1} y1={y1} x2={x2} y2={y2} className={cls} /> }
  const limbs = (side: 'l' | 'r', cls: string) => <g className={cls}>
    {L(s[`${side}Hip`], s[`${side}K`], 'srf-bone')}{L(s[`${side}K`], s[`${side}A`], 'srf-bone')}{L(s[`${side}Heel`], s[`${side}Toe`], 'srf-bone srf-foot')}
    {L(s[`${side}S`], s[`${side}E`], 'srf-bone srf-arm')}{L(s[`${side}E`], s[`${side}H`], 'srf-bone srf-arm')}
  </g>
  const [hx, hy] = proj(s.head), bottle = s.props?.bottle
  return <g>
    {limbs('l', sideView ? 'srf-far' : 'srf-near')}
    {L(s.lS, s.rS, 'srf-bone')}{L(s.lHip, s.rHip, 'srf-bone')}{L(s.neck, s.pelvis, 'srf-bone srf-trunk')}
    <circle cx={hx} cy={hy} r={0.1} className="srf-head" />
    {limbs('r', 'srf-near')}
    {bottle && [s.lH, s.rH].map((h, i) => { const [x, y] = proj(h); return <rect key={i} x={x - 0.03} y={y - 0.09} width={0.06} height={0.12} rx={0.015} className="srf-prop" /> })}
  </g>
}

function View({ s, label, sideView }: { s: Skeleton; label: string; sideView: boolean }) {
  const wall = s.props?.wall
  return <figure className="srf-view"><svg viewBox="-1.25 -1.85 2.6 1.95" role="img" aria-label={`${label} view`}>
    <line x1={-1.25} y1={0} x2={1.35} y2={0} className="srf-floor" />
    {sideView && wall !== undefined && <rect x={wall} y={-1.85} width={0.06} height={1.85} className="srf-wall" />}
    <Figure s={s} proj={sideView ? side : front} sideView={sideView} />
  </svg><figcaption>{label}</figcaption></figure>
}

export default function MotionDemo({ id, name }: { id: MotionId; name: string }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [playing, setPlaying] = useState(!reduce)
  const [speed, setSpeed] = useState(1)
  const [t, setT] = useState(0)
  const tRef = useRef(0)
  useEffect(() => {
    if (!playing) return
    let raf = 0, last = performance.now()
    const tick = (now: number) => {
      tRef.current = (tRef.current + ((now - last) / 1000) * speed / CYCLE_SECONDS[id]) % 1
      last = now; setT(tRef.current); raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, id])
  const s = pose(id, t)
  return <div className="srf-motion">
    <div className="srf-views"><View s={s} label="Front" sideView={false} /><View s={s} label="Side" sideView /></div>
    <p className="srf-angle" aria-live="off">{annotation(id, t)}</p>
    <div className="srf-motion-controls">
      <Button size="sm" variant="outline" onClick={() => setPlaying(p => !p)} aria-label={playing ? `Pause ${name} demo` : `Play ${name} demo`}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : 'Play'}</Button>
      <Button size="sm" variant="outline" onClick={() => { tRef.current = 0; setT(0); setPlaying(true) }}><RotateCcw size={16} />Replay</Button>
      <Button size="sm" variant="outline" onClick={() => setSpeed(v => (v === 1 ? 0.5 : 1))} aria-label="Change speed">Speed {speed}×</Button>
    </div>
  </div>
}
