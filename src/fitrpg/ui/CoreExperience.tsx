import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Activity, ArrowRight, BookOpen, Check, ChevronRight, Flame, Shield, Timer, Trophy, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Session } from '../lib/store'
import type { Feel, Progress } from '../lib/game'
import * as g from '../lib/game'
import { bodyArt, ACCEPTED_ART_COUNT, titleFor } from '../lib/levels'
import { reviewedDayPlan } from '../lib/plan'
import ExerciseLibrary, { EXISTING_GUIDES } from './ExerciseLibrary'
import { confirmTarget } from './coreRules'

type Page = 'home' | 'today' | 'hunter' | 'progress' | 'settings'
type Props = {
  page: Page; session: Session | null; status: string; error: string; notice: string; restoreError: boolean
  restore: () => void; authenticate: (username: string, password: string, signup: boolean) => Promise<void>
  logout: () => Promise<void>; update: (progress: Progress) => Promise<void>; chooseAvatar: () => Promise<void>
  motion: boolean; setMotion: (value: boolean) => void; t0: number | null; setT0: (value: number | null) => void
}
const links = [{ to: '/', label: 'Dashboard', icon: Activity }, { to: '/today', label: 'Today', icon: Flame }, { to: '/hunter', label: 'Ranks', icon: Shield }, { to: '/progress', label: 'Progress', icon: Trophy }, { to: '/settings', label: 'Settings', icon: Zap }] as const
const today = () => new Date().toLocaleDateString('en-CA')

function Account({ authenticate, restoreError, restore }: Pick<Props, 'authenticate' | 'restoreError' | 'restore'>) {
  const [signup, setSignup] = useState(false)
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  return <main className="srf-core srf-account dark"><div className="srf-account-brand"><span className="srf-eyebrow">THE SYSTEM IS WAITING</span><h1>SHADOW RISE<span>FITNESS</span></h1><p>Your journey. Your pace. Your rise.</p></div>
    <form className="srf-account-form" onSubmit={async e => { e.preventDefault(); if (busy) return; setError(''); if (signup && confirm !== password) return setError('Passwords do not match.'); setBusy(true); try { await authenticate(username.trim().toLowerCase(), password, signup) } catch (err) { setError(err instanceof Error ? err.message : 'Could not connect. Try again.') } finally { setBusy(false) } }}>
      <div className="srf-eyebrow">PLAYER ACCESS</div><h2>{signup ? 'Create your account' : 'Welcome back, hunter'}</h2>
      {restoreError ? <><p role="alert">Your saved login could not be verified. Nothing was deleted. Workouts stay unavailable until verification succeeds.</p><Button type="button" onClick={restore}>Retry connection</Button></> : <>
      <label>Username<input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your hunter name" /></label>
      <label>Password<input required type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="8–72 characters" /></label>
      {signup && <label>Confirm password<input required type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>}
      {error && <p role="alert" className="srf-alert">{error}</p>}<Button className="srf-primary" disabled={busy} type="submit">{busy ? 'Connecting…' : signup ? 'Create account' : 'Enter the System'}<ArrowRight /></Button>
      <Button type="button" variant="ghost" onClick={() => { setSignup(!signup); setError('') }}>{signup ? 'Already a hunter? Log in' : 'New hunter? Create account'}</Button>
      <p className="srf-muted">Username and password only. Email password recovery is unavailable.</p></>}
    </form></main>
}

function Target({ session, update, status, t0, setT0 }: Pick<Props, 'session' | 'update' | 'status' | 't0' | 'setT0'>) {
  const [feedback, setFeedback] = useState<Feel | null>(null); const [openedDay, setOpenedDay] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  const [, tick] = useState(0)
  useEffect(() => { const timer = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(timer) }, [])
  if (!session) return null
  const day = today(); const p = session.progress; const plan = reviewedDayPlan(day, p.future, p.prog)
  const locked = Boolean(p.prog?.lock); const pendingHealth = Boolean(p.pending?.symptom && p.pending.symptom !== 'none')
  const done = p.doneDays.includes(day) || p.doneDays.includes(`rest:${day}`); const blocked = locked || pendingHealth || status === 'failed' || status === 'saving'
  const eligible = plan.kind === 'train' && !blocked && !done
  return <section className="srf-target"><div className="srf-section-heading"><div><span className="srf-eyebrow">DAILY QUEST · {day}</span><h2>{plan.label}</h2></div><span className="srf-pill">Reviewed baseline</span></div>
    {locked || pendingHealth ? <div className="srf-alert" role="alert">Training is paused by a recorded safety restriction. Stop exercising and get medical advice before your next workout. Existing restrictions remain in place.</div> : <div className="srf-moves">{plan.moves.map(([name, dose], i) => {
      const guide = EXISTING_GUIDES.find(x => name.toLowerCase().includes(x.id === 'bottle-curl' ? 'bottle curl' : x.id === 'room-walk' ? 'walk' : x.id.replaceAll('-', '-')))
      const held = guide && Boolean(p.prog?.holds?.[guide.id])
      return <div className="srf-move" key={name}><span className="srf-move-index">{String(i + 1).padStart(2, '0')}</span><div><h3>{name}</h3>{held && <span className="srf-alert">On hold — skip this movement. No playback.</span>}</div><strong>{dose}</strong></div>
    })}{!plan.moves.length && <p className="srf-muted">{plan.kind === 'rest' ? 'Recovery day. No training prescribed.' : 'No workout prescribed. Readiness review pending.'}</p>}</div>}
    <div className="srf-actions"><Button className="srf-primary" disabled={!eligible} onClick={() => { setFeedback(null); setOpenedDay(day) }}>{done ? <><Check /> Completed today</> : <>Complete daily target <ChevronRight /></>}</Button>
      <Button variant="outline" disabled={done || busy || status === 'saving' || status === 'failed'} onClick={() => update(g.rest(p, day))}>Rest today</Button>
      <Button variant="outline" disabled={blocked || plan.kind !== 'train'} onClick={() => { if (t0 === null) setT0(Date.now()); else { void update(g.addSession(p, day, (Date.now() - t0) / 1000)); setT0(null) } }}><Timer />{t0 === null ? 'Start timer' : `Stop · ${Math.floor((Date.now() - t0) / 60000)}:${String(Math.floor((Date.now() - t0) / 1000) % 60).padStart(2, '0')}`}</Button>
    </div><p className="srf-muted">Keep 2–3 good reps in reserve. XP changes cosmetics, never your training dose.</p>
    {openedDay && <div className="srf-overlay"><section className="srf-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title"><span className="srf-eyebrow">QUEST CONFIRMATION</span><h2 id="feedback-title">How did it feel?</h2><div className="srf-feedback">{(['easy', 'medium', 'hard'] as const).map(f => <Button variant={feedback === f ? 'default' : 'outline'} key={f} aria-pressed={feedback === f} onClick={() => setFeedback(f)}>{f[0].toUpperCase() + f.slice(1)}</Button>)}</div><p className="srf-muted">Confirm your daily target to earn 120 XP. Your routine stays unchanged.</p>
      {openedDay !== day && <p role="alert">The date changed. Cancel and reopen today’s target.</p>}
      <Button className="srf-primary" disabled={!feedback || busy || !eligible || openedDay !== day} onClick={async () => { const next = confirmTarget(p, openedDay, feedback); if (next === p) return; setBusy(true); try { await update(next); setOpenedDay(null) } finally { setBusy(false) } }}>Confirm completion</Button><Button variant="ghost" disabled={busy} onClick={() => setOpenedDay(null)}>Cancel</Button>
    </section></div>}
  </section>
}

export default function CoreExperience(props: Props) {
  const { session, page, status, error, notice, logout, motion, setMotion } = props
  if (!session) return <Account authenticate={props.authenticate} restoreError={props.restoreError} restore={props.restore} />
  const p = session.progress; const level = g.levelFromXp(p.xp); const art = bodyArt(level.level); const plan = reviewedDayPlan(today(), p.future, p.prog)
  return <main id="top" className={`srf-core dark${motion ? '' : ' srf-still'}`}>
    <header className="srf-header"><Link to="/" className="srf-brand">SHADOW RISE <span>FITNESS</span></Link><div className="srf-player"><span className="srf-status">{status === 'saving' ? 'Saving…' : status === 'failed' ? 'Not saved' : status === 'saved' ? 'Server saved' : 'Player online'}</span><strong>{session.username}</strong></div></header>
    <nav className="srf-nav" aria-label="Main">{links.map(({ to, label, icon: Icon }) => <Button variant="ghost" asChild key={to}><Link to={to} aria-current={(page === 'home' ? '/' : `/${page}`) === to ? 'page' : undefined}><Icon /><span>{label}</span></Link></Button>)}<Button variant="ghost" asChild><a href="#exercise-library"><BookOpen /><span>Library</span></a></Button></nav>
    <div className="srf-content">{error && <div className="srf-alert" role="alert">{error}<Button variant="outline" onClick={props.restore}>Reload saved progress</Button></div>}{notice && <p role="status">{notice}</p>}
    {!session.avatar && <div className="srf-intro"><span className="srf-eyebrow">HUNTER REGISTRATION</span><h2>Your journey begins</h2><p>Sung Jinwoo is your dashboard avatar.</p><Button className="srf-primary" onClick={props.chooseAvatar}>Confirm hunter <ArrowRight /></Button></div>}
    {page === 'home' && <>
      <section className="srf-dashboard"><div className="srf-dashboard-copy"><span className="srf-eyebrow">PLAYER STATUS / {String(level.level).padStart(3, '0')}</span><h1>ARISE,<br />{session.username.toUpperCase()}.</h1><div className="srf-rank"><Shield />{titleFor(level.level)}</div>{p.title && <span className="srf-title">{p.title}</span>}<div className="srf-xp"><div><strong>LEVEL {level.level}</strong><span>{level.into} / {level.need} XP</span></div><progress max={level.need} value={Math.min(level.into, level.need)} /></div><p className="srf-muted">{art.distinct ? `Approved level ${level.level} drawing` : `Level ${level.level} artwork unavailable · showing level ${art.artLevel} rank anchor`}</p><Button className="srf-primary" asChild><Link to="/today">Open today’s quest <ArrowRight /></Link></Button></div>
      <figure className="srf-avatar"><img src={art.src} alt={`Sung Jinwoo — ${art.distinct ? `approved level ${level.level}` : `level ${art.artLevel} fallback for level ${level.level}`}`} /><figcaption>SUNG JINWOO</figcaption></figure></section>
      <div className="srf-metrics"><div><Zap /><strong>{p.xp}</strong><span>Total XP</span></div><div><Check /><strong>{p.doneDays.length}</strong><span>Completed days</span></div><div><Timer /><strong>{p.sets?.[today()] ?? 0}</strong><span>Recorded sets today</span></div></div>
      <section className="srf-next"><div><span className="srf-eyebrow">TODAY’S WORKOUT</span><h2>{plan.label}</h2><p>{p.prog?.lock ? 'Training paused. Recorded safety restriction.' : `${plan.moves.length ? 'Your reviewed routine is ready.' : 'No training prescribed today.'}`}</p></div><Button variant="outline" asChild><Link to="/today">View quest <ArrowRight /></Link></Button></section>
    </>}
    {page === 'today' && <Target {...props} />}
    {page === 'hunter' && <section><span className="srf-eyebrow">ART READINESS · {ACCEPTED_ART_COUNT}/100 APPROVED</span><h1>Rank registry</h1><p className="srf-muted">63 genuine level drawings remain unavailable. No recolor or scaled clone is counted as unique art.</p><div className="srf-registry">{Array.from({ length: 100 }, (_, i) => { const a = bodyArt(i + 1); return <div key={i}><strong>LV {i + 1}</strong><span>{titleFor(i + 1)}</span><small>{a.distinct ? 'Approved distinct drawing' : `Unavailable · level ${a.artLevel} fallback`}</small></div> })}</div></section>}
    {page === 'progress' && <section><span className="srf-eyebrow">PLAYER RECORD</span><h1>Your progress</h1><div className="srf-metrics"><div><Zap /><strong>{p.xp}</strong><span>Total XP</span></div><div><Trophy /><strong>{level.level}</strong><span>Level</span></div><div><Check /><strong>{p.doneDays.length}</strong><span>Completed days</span></div></div><h2>Recent sessions</h2>{(p.sessions ?? []).slice(-14).reverse().map((x, i) => <div className="srf-history" key={i}><span>{x.day}</span><strong>{Math.floor(x.seconds / 60)} min {x.seconds % 60} s</strong></div>)}{!p.sessions?.length && <p className="srf-muted">No recorded sessions yet.</p>}<p className="srf-muted">Physical progression is disabled. Recorded reviews, holds and restrictions are retained.</p></section>}
    {page === 'settings' && <section><span className="srf-eyebrow">SYSTEM PREFERENCES</span><h1>Settings</h1><label className="srf-toggle"><input type="checkbox" checked={motion} onChange={e => setMotion(e.target.checked)} /> Animated titles</label><p className="srf-muted">English interface. Existing local guides are retained; audio and motion upgrades are pending.</p><Button variant="outline" onClick={logout}>Log out</Button></section>}
    <ExerciseLibrary locked={Boolean(p.prog?.lock || p.pending?.symptom && p.pending.symptom !== 'none')} holds={p.prog?.holds ?? {}} />
    <footer className="srf-footer">SHADOW RISE FITNESS<span>Cosmetic ranks. Reviewed training. Your own pace.</span></footer></div>
  </main>
}