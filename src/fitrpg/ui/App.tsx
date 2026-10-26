// @ts-nocheck
import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Backend, Session } from '../lib/store'
import { supabaseBackend } from '../lib/supa'
import { ROSTER, filterRoster, Hunter } from '../lib/roster'
import * as g from '../lib/game'
import { titleFor, PROFILE_TITLES, ANIME_ANCHORS, bodyBlend, FULLBODY } from '../lib/levels'
import { dayPlan } from '../lib/plan'

const env = import.meta.env
// Public client values (safe to ship): project URL and publishable key. Data is protected by row level security.
const SB_URL = env.VITE_SUPABASE_URL || 'https://ahokjyjxucccbfzgpwmc.supabase.co'
const SB_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xoxbWJHEcUJ6o76dpV3-EQ_CkznWUHF'
const real = true
const backend: Backend | null = supabaseBackend(SB_URL, SB_KEY)
const DEMO = 'fitrpg-demo'
const loadDemo = (): Session => { try { return JSON.parse(localStorage.getItem(DEMO) || '') } catch { return { username: 'demo', avatar: null, progress: g.emptyProgress() } } }
const saveAny = async (s: Session, patch: { avatar?: string; progress?: g.Progress }) => { if (backend) await backend.save(s.username, patch); else localStorage.setItem(DEMO, JSON.stringify({ ...s, ...patch })) }
const today = () => new Date().toLocaleDateString('en-CA')

function Portrait({ h }: { h: Hunter }) { return <img className="art" src={`/avatars/${h.id}.jpg`} alt={h.name} /> }

export type Page = 'home' | 'today' | 'hunter' | 'progress' | 'settings'
const NAV: [Page, string, string][] = [['home', '/', 'Home'], ['today', '/today', "Today's Workout"], ['hunter', '/hunter', 'Hunter'], ['progress', '/progress', 'Progress'], ['settings', '/settings', 'Settings']]
export default function App({ page = 'home' }: { page?: Page }) {
  const [s, setS] = useState<Session | null>(() => (!real && localStorage.getItem(DEMO) ? loadDemo() : null))
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [p2, setP2] = useState('')
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<'all' | 'M' | 'F' | 'Hunter' | 'Monarch'>('all')
  const [pick, setPick] = useState<string | null>(null)
  const [motion, setMotion] = useState(true)
  const [step, setStep] = useState<null | 'feel' | 'symptom'>(null)
  const [feel, setFeel] = useState<g.Feel | null>(null)
  const [sym, setSym] = useState<g.Symptom | null>(null)

  useEffect(() => { backend?.restore().then(r => { if (r) setS(r) }).catch(() => {}) }, [])
  async function logout() { await backend?.signOut(); setS(null); setU(''); setP(''); setP2('') }
  async function auth() {
    setErr('')
    if (mode === 'up' && p !== p2) return setErr('Passwords do not match.')
    try { setS(await (mode === 'up' ? backend!.signUp(u, p) : backend!.signIn(u, p))) } catch (e: any) { setErr(e.message) }
  }
  async function update(pr: g.Progress) { if (!s) return; const n = { ...s, progress: pr }; setS(n); await saveAny(s, { progress: pr }) }
  const lv = useMemo(() => g.levelFromXp(s?.progress.xp ?? 0), [s])
  const band = Math.min(9, Math.floor((lv.level - 1) / 10))
  const [t0, setT0] = useState<number | null>(null); const [, tick] = useState(0)
  useEffect(() => { if (t0 === null) return; const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i) }, [t0])

  if (!s && !real) return (
    <main className={motion ? 'sys' : 'sys still'}><section className="card auth">
      <div className="tag">[ SYSTEM ] DEMO MODE</div><h1>START</h1>
      <p className="note">Demo only: no password, progress is saved in this browser only. Real accounts with server saving need the account service connected.</p>
      <button className="btn" onClick={() => setS(loadDemo())}>START DEMO</button>
    </section></main>)
  if (!s) return (
    <main className={motion ? 'sys' : 'sys still'}><section className="card auth">
      <div className="tag">[ SYSTEM ] PLAYER REGISTRATION</div>
      <h1>{mode === 'up' ? 'CREATE ACCOUNT' : 'LOG IN'}</h1>
      <input placeholder="Username" value={u} onChange={e => setU(e.target.value.toLowerCase())} autoComplete="username" />
      <input placeholder="Password (8 to 72 characters)" type="password" value={p} onChange={e => setP(e.target.value)} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />
      {mode === 'up' && <input placeholder="Confirm password" type="password" value={p2} onChange={e => setP2(e.target.value)} autoComplete="new-password" />}
      {err && <div className="err" role="alert">{err}</div>}
      <button className="btn" onClick={auth}>{mode === 'up' ? 'CREATE ACCOUNT' : 'LOG IN'}</button>
      <p className="note">Accounts use a username and password only, with no email. There is no password reset: if you lose your password, you will need to create a new account.</p>
      <a href="#" onClick={e => { e.preventDefault(); setMode(mode === 'up' ? 'in' : 'up'); setErr('') }}>{mode === 'up' ? 'Already a player? Log in' : 'New player? Create account'}</a>
    </section></main>)

  if (!s.avatar) {
    const list = filterRoster(tab)
    return (<main className={motion ? 'sys' : 'sys still'}><section className="card wide">
      <div className="tag">[ SYSTEM ] CHOOSE YOUR HUNTER</div><h1>AVATAR SELECT</h1>
      <div className="tabs">{(['all', 'M', 'F', 'Hunter', 'Monarch'] as const).map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{({ all: 'All', M: 'Male', F: 'Female', Hunter: 'S-Rank Hunters', Monarch: 'Monarchs' })[t]}</button>)}</div>
      <div className="grid">{list.map(h => <button key={h.id} className={'tile' + (pick === h.id ? ' sel' : '')} onClick={() => setPick(h.id)}>
        <Portrait h={h} /><b>{h.name}</b><i>{h.group}{h.note ? ' - ' + h.note : ''}</i></button>)}</div>
      <button className="btn" disabled={!pick} onClick={async () => { await saveAny(s, { avatar: pick! }); setS({ ...s, avatar: pick }) }}>CONFIRM AVATAR</button>
    </section></main>)
  }

  const h = ROSTER.find(x => x.id === s.avatar)!
  const day = today()
  const done = s.progress.doneDays.includes(day)
  const plan = dayPlan(day)
  const canTrain = plan.kind === 'train'
  async function finish() {
    if (!feel) return
    if (g.needsSymptomStep(feel) && !sym) return setStep('symptom')
    await update(g.complete(s!.progress, day, feel, sym)); setStep(null); setFeel(null); setSym(null)
  }
  return (<main className={motion ? 'sys' : 'sys still'}>
    <div className="demo" role="status">Early version. Accounts and server saving are live. Still being added: Hindi trainer demo videos, a different avatar image for every level (avatars change in 10 steps with a blend between them), and plans after 1 Nov.</div>
    <nav className="nav" aria-label="Main">{NAV.map(([k, to, label]) => <Link key={k} to={to as any} className={page === k ? 'on' : ''}>{label}</Link>)}</nav>
    <section className="dash">
      {page === 'home' && <>
      <div className="card hero"><figure className="now" style={{ ['--glow' as any]: lv.level / 100 }}>{h.id === 'sung-jinwoo' ? <div className="body" data-testid="fullbody">{(() => { const b = bodyBlend(lv.level); return <div style={{ filter: `drop-shadow(0 0 ${4 + b.aura * 22}px rgba(140,90,255,${0.2 + b.aura * 0.6}))` }}><img className="art body" src={`/body/jinwoo-${String(b.a).padStart(2, '0')}.webp`} alt={`Sung Jinwoo full body, level ${lv.level}`} />{b.b && <img className="art body over" style={{ opacity: b.mix }} src={`/body/jinwoo-${String(b.b).padStart(2, '0')}.webp`} alt="" />}</div> })()}<img className="face" src={`/avatars/jinwoo-anime/${ANIME_ANCHORS[band]}.jpg`} alt="Anime face" /></div> : FULLBODY[h.id] ? <img className="art body" src={FULLBODY[h.id]} alt={h.name + ' full body'} /> : <Portrait h={h} />}<figcaption>{h.name}</figcaption></figure>
        <div className="ranks"><span className="rank">{titleFor(lv.level)}</span><span className="lvl">LV {lv.level}</span>{s.progress.title && <span className="title-badge">{s.progress.title}</span>}</div></div>
      <div className="card stats"><div className="tag">[ SYSTEM ] {h.name.toUpperCase()}</div><h2>LEVEL {lv.level}</h2>
        <div className="bar"><div style={{ width: `${(lv.into / lv.need) * 100}%` }} /></div><small>XP {lv.into} / {lv.need}</small>
        
      </div>
        <div className="card quest"><div className="tag">TODAY - {plan.label}</div><p>{canTrain ? (done ? 'Quest complete. Nice work.' : 'Your quest is ready.') : 'No training today. Rest counts, no penalty.'}</p><Link className="btn" to={'/today' as any}>OPEN TODAY'S WORKOUT</Link></div>
      </>}
      {page === 'today' && <>
      <div className="card quest"><div className="tag">DAILY QUEST - {day} - {plan.label}</div>
        <ul>{plan.moves.map(([n, r]) => <li key={n}><span>{n}</span><b>{r}</b></li>)}{!plan.moves.length && <li><span>{plan.kind === 'before' ? 'Your plan starts on Tue 27 Oct 2026.' : plan.kind === 'none' ? 'Next plan is pending. Nothing harder is unlocked by XP.' : 'No training today. Rest counts, no penalty.'}</span></li>}</ul>
        <div className="row"><button className="btn" disabled={done || !canTrain} onClick={() => { update(g.startPending(s.progress, day)); setStep('feel') }}>{done ? 'DONE TODAY' : 'TARGET DONE'}</button>
          <button className="btn ghost" disabled={done} onClick={() => update(g.rest(s.progress, day))}>REST TODAY</button>
          <button className="btn ghost" onClick={() => { setStep(null); setFeel(null); setSym(null) }}>STOP</button></div></div>
      <div className="card quest"><div className="tag">SESSION</div>
        <div className="row"><button className="btn" onClick={() => { if (t0 === null) setT0(Date.now()); else { update(g.addSession(s.progress, day, (Date.now() - t0) / 1000)); setT0(null) } }}>{t0 === null ? 'START TIMER' : `STOP ${Math.floor((Date.now() - t0) / 60000)}:${String(Math.floor(((Date.now() - t0) / 1000) % 60)).padStart(2, '0')}`}</button>
          <button className="btn ghost" onClick={() => update(g.setSets(s.progress, day, (s.progress.sets?.[day] ?? 0) - 1))}>-</button><b>Sets today: {s.progress.sets?.[day] ?? 0}</b><button className="btn ghost" onClick={() => update(g.setSets(s.progress, day, (s.progress.sets?.[day] ?? 0) + 1))}>+</button></div>
        <div className="tag">RECENT SESSIONS</div><ul>{(s.progress.sessions ?? []).slice(-7).reverse().map((x, i) => <li key={i}><span>{x.day}</span><b>{Math.floor(x.seconds / 60)} min {x.seconds % 60} s</b></li>)}{!(s.progress.sessions ?? []).length && <li><span>No sessions yet</span></li>}</ul></div>
      </>}
      {page === 'hunter' && <>
      <div className="card hero"><figure className="now" style={{ ['--glow' as any]: lv.level / 100 }}>{h.id === 'sung-jinwoo' ? <div className="body" data-testid="fullbody">{(() => { const b = bodyBlend(lv.level); return <div style={{ filter: `drop-shadow(0 0 ${4 + b.aura * 22}px rgba(140,90,255,${0.2 + b.aura * 0.6}))` }}><img className="art body" src={`/body/jinwoo-${String(b.a).padStart(2, '0')}.webp`} alt={`Sung Jinwoo full body, level ${lv.level}`} />{b.b && <img className="art body over" style={{ opacity: b.mix }} src={`/body/jinwoo-${String(b.b).padStart(2, '0')}.webp`} alt="" />}</div> })()}<img className="face" src={`/avatars/jinwoo-anime/${ANIME_ANCHORS[band]}.jpg`} alt="Anime face" /></div> : FULLBODY[h.id] ? <img className="art body" src={FULLBODY[h.id]} alt={h.name + ' full body'} /> : <Portrait h={h} />}<figcaption>{h.name}</figcaption></figure>
        <div className="ranks"><span className="rank">{titleFor(lv.level)}</span><span className="lvl">LV {lv.level}</span>{s.progress.title && <span className="title-badge">{s.progress.title}</span>}</div></div>
        <div className="card stats"><div className="tag">[ SYSTEM ] TITLES</div><h2>{titleFor(lv.level)}</h2>
        <label className="mo">Title <select value={s.progress.title ?? ''} onChange={e => update({ ...s.progress, title: e.target.value || undefined })}><option value="">None</option>{PROFILE_TITLES.filter(t => lv.level >= t.at).map(t => <option key={t.name} value={t.name}>{t.name}</option>)}</select></label>
        <small>Next title: {(PROFILE_TITLES.find(t => lv.level < t.at) ?? { name: 'all unlocked', at: 0 }).name}{PROFILE_TITLES.find(t => lv.level < t.at) ? ` at level ${PROFILE_TITLES.find(t => lv.level < t.at)!.at}` : ''}</small>
        <small>Titles unlocked: {PROFILE_TITLES.filter(t => lv.level >= t.at).length} / {PROFILE_TITLES.length}</small></div>
      </>}
      {page === 'progress' && <>
        <div className="card stats"><div className="tag">PROGRESS</div><h2>LEVEL {lv.level}</h2><div className="bar"><div style={{ width: `${(lv.into / lv.need) * 100}%` }} /></div><small>XP {lv.into} / {lv.need}</small><small>Days completed: {s.progress.doneDays.length}</small></div>
        <div className="card quest"><div className="tag">RECENT SESSIONS</div><ul>{(s.progress.sessions ?? []).slice(-14).reverse().map((x, i) => <li key={i}><span>{x.day}</span><b>{Math.floor(x.seconds / 60)} min {x.seconds % 60} s</b></li>)}{!(s.progress.sessions ?? []).length && <li><span>No sessions yet</span></li>}</ul></div>
      </>}
      {page === 'settings' && <>
        <div className="card stats"><div className="tag">SETTINGS</div>
        <label className="mo"><input type="checkbox" checked={motion} onChange={e => setMotion(e.target.checked)} /> Animations</label>        <small>Words on screen are English. Trainer voice demos (Hindi) are still being added.</small><button className="btn ghost" onClick={logout}>LOG OUT</button>{!real && <button className="btn ghost" onClick={() => { localStorage.removeItem(DEMO); location.href = '/' }}>RESET DEMO DATA</button>}</div>
      </>}
    </section>
    {step === 'feel' && <div className="modal"><div className="card"><h3>HOW DID IT FEEL?</h3>{(['easy', 'medium', 'hard'] as const).map(f => <button key={f} className={'opt' + (feel === f ? ' on' : '')} onClick={() => setFeel(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}<button className="btn" disabled={!feel} onClick={finish}>CONFIRM</button></div></div>}
    {step === 'symptom' && <div className="modal"><div className="card"><h3>ANY OF THESE?</h3>{([['pain', 'Pain'], ['dizziness', 'Dizziness'], ['breathing', 'Breathing feels unusual'], ['none', 'None of these']] as const).map(([k, l]) => <button key={k} className={'opt' + (sym === k ? ' on' : '')} onClick={() => setSym(k)}>{l}</button>)}
      {sym && sym !== 'none' && <div className="err">Stop for today. Rest, and check in with a doctor if it continues.</div>}<button className="btn" disabled={!sym} onClick={finish}>CONFIRM</button></div></div>}
  </main>)
}
