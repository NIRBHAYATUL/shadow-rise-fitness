// @ts-nocheck
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import { Backend, Session } from '../lib/store'
import { supabaseBackend } from '../lib/supa'
import { ROSTER, filterRoster, Hunter } from '../lib/roster'
import * as g from '../lib/game'
import { titleFor, PROFILE_TITLES, ANIME_ANCHORS, bodyBlend, FULLBODY } from '../lib/levels'
import { dayPlan, reviewedDayPlan } from '../lib/plan'
import * as pg from '../lib/progression'
import { recordPending, clearPending, readPending, withPending, reconcileSafety } from '../lib/safetyOutbox'

const env = import.meta.env
// Public client values (safe to ship): project URL and publishable key. Data is protected by row level security.
const SB_URL = env.VITE_SUPABASE_URL || 'https://ahokjyjxucccbfzgpwmc.supabase.co'
const SB_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xoxbWJHEcUJ6o76dpV3-EQ_CkznWUHF'
const real = true
const backend: Backend | null = supabaseBackend(SB_URL, SB_KEY)
const DEMO = 'fitrpg-demo'
const loadDemo = (): Session => { try { return JSON.parse(localStorage.getItem(DEMO) || '') } catch { return { username: 'demo', avatar: null, progress: g.emptyProgress() } } }
const saveAny = async (s: Session, patch: { avatar?: string; progress?: g.Progress }) => { if (backend) return await backend.save(s.username, patch); else localStorage.setItem(DEMO, JSON.stringify({ ...s, ...patch })) }
const VIDEOS: [RegExp, string][] = [[/room walk/i, '/hindi/room-walk-hi.mp4'], [/calf raise/i, '/hindi/calf-raise-hi.mp4'], [/bottle curl/i, '/hindi/bottle-curl-hi.mp4'], [/cool-down/i, '/hindi/cool-down-hi.mp4'], [/^bridge/i, '/hindi/bridge-hi.mp4'], [/wall push-up/i, '/hindi/wall-pushup-hi.mp4'], [/mini-squat/i, '/hindi/mini-squat-hi.mp4'], [/bird-dog/i, '/hindi/bird-dog-hi.mp4']]
const videoFor = (n: string) => VIDEOS.find(([r]) => r.test(n))?.[1]
let cachedSession: Session | null = null
const lsGet = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const lsSet = (k: string, v: string | null) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch {} }
const today = () => new Date().toLocaleDateString('en-CA')

function Portrait({ h }: { h: Hunter }) { return <img className="art" src={`/avatars/${h.id}.jpg`} alt={h.name} /> }

export type Page = 'home' | 'today' | 'hunter' | 'progress' | 'settings'
const NAV: [Page, string, string][] = [['home', '/', 'Home'], ['today', '/today', "Today's Workout"], ['hunter', '/hunter', 'Hunter'], ['progress', '/progress', 'Progress'], ['settings', '/settings', 'Settings']]
// Saves run one after another so an older write can never land after a newer one.
let saveChain: Promise<unknown> = Promise.resolve()
// Server-acknowledged save status shared by every page: 'saving' until the server confirms.
type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'
let pendingSaves = 0
let sessionGen = 0 // bumps when the user confirms a logout, so a late result from the old account cannot touch the next account's status
let saveStatus: SaveStatus = 'idle'
const statusSubs = new Set<() => void>()
const setStatus = (v: SaveStatus) => { saveStatus = v; statusSubs.forEach(f => f()) }
const subStatus = (f: () => void) => { statusSubs.add(f); return () => { statusSubs.delete(f) } }
if (typeof window !== 'undefined') window.addEventListener('beforeunload', e => { if (pendingSaves > 0) { e.preventDefault(); e.returnValue = '' } })
export default function App({ page = 'home' }: { page?: Page }) {
  const [s, setS] = useState<Session | null>(() => (!real && localStorage.getItem(DEMO) ? loadDemo() : cachedSession))
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [p2, setP2] = useState('')
  const [err, setErr] = useState('')
  const [tk, setTick] = useState(0)
  const status = useSyncExternalStore(subStatus, () => saveStatus)
  useEffect(() => { const i = setInterval(() => setTick(x => x + 1), 30000); return () => clearInterval(i) }, [])
  const [tab, setTab] = useState<'all' | 'M' | 'F' | 'Hunter' | 'Monarch'>('all')
  const [pick, setPick] = useState<string | null>(null)
  const [motion, setMotionRaw] = useState(() => lsGet('srf-motion') !== 'off')
  const setMotion = (v: boolean) => { setMotionRaw(v); lsSet('srf-motion', v ? null : 'off') }
  const [saveErr, setSaveErr] = useState('')
  const [doneEx, setDoneEx] = useState<string[]>([]); const [painEx, setPainEx] = useState<string[]>([])
  const toggle = (arr: string[], set: (v: string[]) => void, k: string) => set(arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k])
  const [step, setStep] = useState<null | 'feel' | 'symptom'>(null)
  const [qDay, setQDay] = useState<string | null>(null) // the day the quest popup was opened for
  const [notice, setNotice] = useState('')
  const [feel, setFeel] = useState<g.Feel | null>(null)
  const [sym, setSym] = useState<g.Symptom | null>(null)

  useEffect(() => { if (step && qDay && qDay !== today()) { setStep(null); setFeel(null); setSym(null); setQDay(null); setNotice('The date changed while the quest popup was open, so it was cancelled. Nothing was awarded. Start again for today.') } }, [tk, step, qDay])
  useEffect(() => { if (cachedSession) return; backend?.restore().then(r0 => { const r = r0 ? withPending(r0) : r0; if (r) { cachedSession = r; setS(r) } else { cachedSession = null; setS(null) } }).catch(() => {}) }, [])
  async function logout() { await Promise.race([saveChain.catch(() => {}), new Promise(r => setTimeout(r, 8000))]); if ((pendingSaves > 0 || saveStatus === 'failed') && !window.confirm('Your last change has not been saved to the server. If you log out now it will be lost. Log out anyway?')) return; await backend?.signOut(); sessionGen++; pendingSaves = 0; setStatus('idle'); setSaveErr(''); cachedSession = null; lsSet('srf-t0', null); setS(null); setU(''); setP(''); setP2('') }
  async function auth() {
    setErr('')
    if (mode === 'up' && p !== p2) return setErr('Passwords do not match.')
    try { const r = withPending(await (mode === 'up' ? backend!.signUp(u, p) : backend!.signIn(u, p))); cachedSession = r; setS(r) } catch (e: any) { setErr(e.message) }
  }
  async function update(pr: g.Progress) { if (!s) return; const n = { ...s, progress: pr }; cachedSession = n; setS(n); setSaveErr(''); const gen = sessionGen; if (backend) recordPending(s.username, pr); pendingSaves++; setStatus('saving'); const job = saveChain.then(() => saveAny(s, { progress: pr })); saveChain = job.catch(() => {}); try { const saved = await job; if (gen !== sessionGen) return; pendingSaves--; if (pendingSaves === 0) { if (saved?.progress) { const canonical = { ...n, progress: saved.progress }; cachedSession = canonical; setS(canonical) }; setStatus('saved'); clearPending(s.username) } } catch (e) { if (gen !== sessionGen) return; pendingSaves--; setStatus('failed'); setSaveErr(e?.message?.includes('Progress changed on another device') ? e.message : 'Could not save to the server. Check your connection and try again.'); if (backend && readPending(s.username)) void safetyRetry(s.username, e?.message?.includes('Progress changed on another device')) } }
  async function safetyRetry(username: string, conflict: boolean) { const r = await reconcileSafety(backend!, username); if (r.ok && r.session) { cachedSession = r.session; setS(r.session); setStatus('saved'); setSaveErr(''); setNotice(conflict ? 'Your safety report was saved. Other changes on this device were not saved. Progress now shows the latest saved version.' : 'Your safety report was saved.') } else if (!r.ok) setSaveErr('Your safety report is not saved to the server yet. It is kept on this device and the programme stays locked here. It retries when you open the app again.') }
  useEffect(() => { if (s && backend && readPending(s.username)) void safetyRetry(s.username, false) }, [s?.username])
  const lv = useMemo(() => g.levelFromXp(s?.progress.xp ?? 0), [s])
  const band = Math.min(9, Math.floor((lv.level - 1) / 10))
  const [t0, setT0r] = useState<number | null>(() => { const v = Number(lsGet('srf-t0')); return v > 0 ? v : null })
  const setT0 = (v: number | null) => { setT0r(v); lsSet('srf-t0', v === null ? null : String(v)) }
  const [, tick] = useState(0)
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
      <div className="grid">{list.map(h => <button key={h.id} className={'tile' + (pick === h.id ? ' sel' : '')} onClick={() => setPick(h.id)}>
        <Portrait h={h} /><b>{h.name}</b><i>{h.group}{h.note ? ' - ' + h.note : ''}</i></button>)}</div>
      <button className="btn ghost" onClick={logout}>LOG OUT</button> <button className="btn" disabled={!pick} onClick={async () => { try { await saveAny(s, { avatar: pick! }) } catch { setErr('Could not save your avatar. Try again.'); return } const n = { ...s, avatar: pick }; cachedSession = n; setS(n) }}>CONFIRM AVATAR</button>
    </section></main>)
  }

  const h = ROSTER.find(x => x.id === s.avatar) ?? ROSTER.find(x => x.id === 'sung-jinwoo')! // unknown stored id: show a placeholder, never change the stored choice
  const day = today()
  const done = s.progress.doneDays.includes(day) || s.progress.doneDays.includes('rest:' + day)
  const plan = reviewedDayPlan(day, s.progress.future, s.progress.prog)
  const canTrain = plan.kind === 'train'
  async function finish() {
    if (!feel) return
    if (g.needsSymptomStep(feel) && !sym) return setStep('symptom')
    if (qDay !== day) { setStep(null); setFeel(null); setSym(null); setQDay(null); return setNotice('The date changed while the quest popup was open, so it was cancelled. Nothing was awarded. Start again for today.') }
    { const before = s!.progress; let after = g.complete(before, qDay, feel, sym); if (after.doneDays.length > before.doneDays.length) after = { ...after, prog: pg.recordDay(before.prog, qDay, feel, sym ?? 'none', dayPlan(qDay).moves.map(m => m[0]), { finished: doneEx as any, painEx: painEx as any }) }; await update(after) }; setDoneEx([]); setPainEx([]); setStep(null); setFeel(null); setSym(null); setQDay(null)
  }
  return (<main className={motion ? 'sys' : 'sys still'}>
    <div className="demo" role="status">Early version. Accounts and server saving are live. Hindi trainer demos are live for all 8 moves (simple schematic guides, not medical advice). Also pending: a different avatar image for every level. Sung Jinwoo is the only avatar. He changes with each rank band (10 art steps, shown one at a time, no blending). After 1 Nov the week 1 baseline repeats unchanged until the readiness review is done. Automatic progression is off.</div>
    {saveErr && <div className="err" role="alert">{saveErr}</div>}
    {notice && <div className="err" role="status">{notice}</div>}
    {status !== 'idle' && !saveErr && <div className="srf-save" role="status">{status === 'saving' ? 'Saving to server...' : status === 'saved' ? 'Saved to server.' : 'Save failed.'}</div>}
    <nav className="nav" aria-label="Main">{NAV.map(([k, to, label]) => <Link key={k} to={to as any} className={page === k ? 'on' : ''}>{label}</Link>)}</nav>
    <section className="dash">
      {page === 'home' && <>
      <div className="card hero"><figure className="now" style={{ ['--glow' as any]: lv.level / 100 }}>{h.id === 'sung-jinwoo' ? <div className="body" data-testid="fullbody">{(() => { const b = bodyBlend(lv.level); return <div style={{ filter: `drop-shadow(0 0 ${4 + b.aura * 22}px rgba(140,90,255,${0.2 + b.aura * 0.6}))` }}><img className="art body" src={`/body/jinwoo-${String(b.b && b.mix >= 0.5 ? b.b : b.a).padStart(2, '0')}.webp`} alt={`Sung Jinwoo full body, level ${lv.level}`} /></div> })()}<img className="face" src={`/avatars/jinwoo-anime/${ANIME_ANCHORS[band]}.jpg`} alt="Anime face" /></div> : FULLBODY[h.id] ? <img className="art body" src={FULLBODY[h.id]} alt={h.name + ' full body'} /> : <Portrait h={h} />}<figcaption>{h.name}</figcaption></figure>
        <div className="ranks"><span className="rank">{titleFor(lv.level)}</span><span className="lvl">LV {lv.level}</span>{s.progress.title && <span className="title-badge">{s.progress.title}</span>}</div></div>
      <div className="card stats"><div className="tag">[ SYSTEM ] {h.name.toUpperCase()}</div><h2>LEVEL {lv.level}</h2>
        <div className="bar"><div style={{ width: `${(lv.into / lv.need) * 100}%` }} /></div><small>XP {lv.into} / {lv.need}</small>
        
      </div>
        <div className="card quest"><div className="tag">TODAY - {plan.label}</div><p>{canTrain ? (done ? (status === 'saving' ? 'Quest complete. Saving to server...' : 'Quest complete. Nice work.') : 'Your quest is ready.') : 'No training today. Rest counts, no penalty.'}</p><Link className="btn" to={'/today' as any}>OPEN TODAY'S WORKOUT</Link></div>
      </>}
      {page === 'today' && <>
      <div className="card quest"><div className="tag">DAILY QUEST - {day} - {plan.label}</div>
        <ul>{plan.moves.map(([n, r]) => <li key={n}><span>{n}</span><b>{r}</b>{videoFor(n) && motion && <img className="loop" loading="lazy" src={videoFor(n)!.replace('-hi.mp4', '-loop.gif')} alt={`${n}: silent movement loop`} />}{videoFor(n) && <details className="vid"><summary>Watch demo (Hindi voice, English captions)</summary><video controls preload="none" playsInline src={videoFor(n)} /></details>}</li>)}{!plan.moves.length && <li><span>{plan.kind === 'before' ? 'Your plan starts on Tue 27 Oct 2026.' : plan.kind === 'none' ? 'Next plan is pending. Nothing harder is unlocked by XP.' : 'No training today. Rest counts, no penalty.'}</span></li>}</ul>
        <div className="row"><button className="btn" disabled={done || !canTrain} onClick={() => { setNotice(''); setQDay(day); update(g.startPending(s.progress, day)); setStep('feel') }}>{done ? 'DONE TODAY' : 'TARGET DONE'}</button>
          <button className="btn ghost" disabled={done} onClick={() => update(g.rest(s.progress, day))}>REST TODAY</button>
          <button className="btn ghost" onClick={() => { setStep(null); setFeel(null); setSym(null); setQDay(null) }}>STOP</button></div></div>
      {(() => { const rd = pg.pendingRecoveryDay(s.progress.prog, day); return rd ? <div className="card quest" data-testid="recovery"><div className="tag">HOW DID YOU FEEL AFTER {rd}?</div><small style={{ display: 'block', margin: '6px 0' }}>Optional. This only helps plan future steps. Nothing changes today.</small><div className="row"><button className="btn ghost" onClick={() => update({ ...s.progress, prog: pg.setRecovery(s.progress.prog, rd, 'ok') })}>FINE, NORMAL</button><button className="btn ghost" onClick={() => update({ ...s.progress, prog: pg.setRecovery(s.progress.prog, rd, 'sore') })}>SORE OR TIRED</button></div></div> : null })()}
      <div className="card quest" data-testid="report-symptom"><div className="tag">FEEL UNWELL?</div>
        <small style={{ display: 'block', margin: '6px 0' }}>Chest pain or tightness, dizziness or faintness, unusual breathlessness, or a new irregular heartbeat: stop and rest. This does not use up your quest.</small>
        <div className="row">{([['chest', 'CHEST PAIN'], ['dizziness', 'DIZZY'], ['breathing', 'BREATHLESS'], ['irregular-heartbeat', 'HEARTBEAT']] as const).map(([k, l]) => <button key={k} className="btn ghost" onClick={() => update({ ...s.progress, prog: pg.reportSymptom(s.progress.prog, day, k) })}>{l}</button>)}</div>
        {s.progress.prog?.lock && <div className="err">Stop exercising and rest. If symptoms are severe or you faint, call 112 (India) immediately. Please get medical advice before your next workout. Progression stays locked until you tell us you have spoken to a medical professional and that they said exercise is okay for you.</div>}</div>
      <div className="card quest"><div className="tag">SESSION</div>
        <div className="row"><button className="btn" onClick={() => { if (t0 === null) setT0(Date.now()); else { update(g.addSession(s.progress, day, (Date.now() - t0) / 1000)); setT0(null) } }}>{t0 === null ? 'START TIMER' : `STOP ${Math.floor((Date.now() - t0) / 60000)}:${String(Math.floor(((Date.now() - t0) / 1000) % 60)).padStart(2, '0')}`}</button>
          <button className="btn ghost" onClick={() => update(g.setSets(s.progress, day, (s.progress.sets?.[day] ?? 0) - 1))}>-</button><b>Sets today: {s.progress.sets?.[day] ?? 0}</b><button className="btn ghost" onClick={() => update(g.setSets(s.progress, day, (s.progress.sets?.[day] ?? 0) + 1))}>+</button></div>
        <div className="tag">RECENT SESSIONS</div><ul>{(s.progress.sessions ?? []).slice(-7).reverse().map((x, i) => <li key={i}><span>{x.day}</span><b>{Math.floor(x.seconds / 60)} min {x.seconds % 60} s</b></li>)}{!(s.progress.sessions ?? []).length && <li><span>No sessions yet</span></li>}</ul></div>
      </>}
      {page === 'hunter' && <>
      <div className="card hero"><figure className="now" style={{ ['--glow' as any]: lv.level / 100 }}>{h.id === 'sung-jinwoo' ? <div className="body" data-testid="fullbody">{(() => { const b = bodyBlend(lv.level); return <div style={{ filter: `drop-shadow(0 0 ${4 + b.aura * 22}px rgba(140,90,255,${0.2 + b.aura * 0.6}))` }}><img className="art body" src={`/body/jinwoo-${String(b.b && b.mix >= 0.5 ? b.b : b.a).padStart(2, '0')}.webp`} alt={`Sung Jinwoo full body, level ${lv.level}`} /></div> })()}<img className="face" src={`/avatars/jinwoo-anime/${ANIME_ANCHORS[band]}.jpg`} alt="Anime face" /></div> : FULLBODY[h.id] ? <img className="art body" src={FULLBODY[h.id]} alt={h.name + ' full body'} /> : <Portrait h={h} />}<figcaption>{h.name}</figcaption></figure>
        <div className="ranks"><span className="rank">{titleFor(lv.level)}</span><span className="lvl">LV {lv.level}</span>{s.progress.title && <span className="title-badge">{s.progress.title}</span>}</div></div>
        <div className="card stats"><div className="tag">[ SYSTEM ] TITLES</div><h2>{titleFor(lv.level)}</h2>
        <label className="mo">Title <select value={s.progress.title ?? ''} onChange={e => update({ ...s.progress, title: e.target.value || undefined })}><option value="">None</option>{PROFILE_TITLES.filter(t => lv.level >= t.at).map(t => <option key={t.name} value={t.name}>{t.name}</option>)}</select></label>
        <small>Next title: {(PROFILE_TITLES.find(t => lv.level < t.at) ?? { name: 'all unlocked', at: 0 }).name}{PROFILE_TITLES.find(t => lv.level < t.at) ? ` at level ${PROFILE_TITLES.find(t => lv.level < t.at)!.at}` : ''}</small>
        <small>Titles unlocked: {PROFILE_TITLES.filter(t => lv.level >= t.at).length} / {PROFILE_TITLES.length}</small></div>
      </>}
      {page === 'progress' && <>
        <div className="card stats"><div className="tag">PROGRESS</div><h2>LEVEL {lv.level}</h2><div className="bar"><div style={{ width: `${(lv.into / lv.need) * 100}%` }} /></div><small>XP {lv.into} / {lv.need}</small><small>Days completed: {s.progress.doneDays.length}</small></div>
        <div className="card quest"><div className="tag">RECENT SESSIONS</div><ul>{(s.progress.sessions ?? []).slice(-14).reverse().map((x, i) => <li key={i}><span>{x.day}</span><b>{Math.floor(x.seconds / 60)} min {x.seconds % 60} s</b></li>)}{!(s.progress.sessions ?? []).length && <li><span>No sessions yet</span></li>}</ul></div>
        <div className="card quest" data-testid="progression"><div className="tag">AUTOMATIC PROGRESSION</div>
          <small style={{ display: 'block', margin: '6px 0' }}>Suggested steps, not medical advice. Not clinically validated.</small>
          <small style={{ display: 'block', margin: '6px 0' }}>{pg.status(s.progress.prog ?? pg.emptyProg())}</small><small style={{ display: 'block', margin: '6px 0' }}>Not active yet: nothing changes before your readiness review is recorded. Automatic sets are not available. Rep steps are planned first.</small>
          <small style={{ display: 'block', margin: '6px 0' }}>Your routine stays the same until your readiness review is recorded. Warm-up (5 min) and cool-down (2 min) never change.</small>
          {s.progress.prog?.lock && <div className="err">Stop exercising and rest if you get chest pain or tightness, dizziness or faintness, unusual breathlessness, or a new irregular heartbeat. If symptoms are severe or you faint, call 112 (India) immediately. Please get medical advice before your next workout. Progression stays locked until you tell us you have spoken to a medical professional and that they said exercise is okay for you.</div>}
          {s.progress.prog?.lastAction && <div><small style={{ display: 'block', margin: '6px 0' }}>Last change: {s.progress.prog.lastAction.ex} moved up after your last sessions were Easy. Only this exercise changed.</small><button className="btn ghost" onClick={() => update({ ...s.progress, prog: pg.revertLast(s.progress.prog) })}>UNDO LAST CHANGE</button></div>}
        </div>
      </>}
      {page === 'settings' && <>
        <div className="card stats"><div className="tag">SETTINGS</div>
        <label className="mo"><input type="checkbox" checked={motion} onChange={e => setMotion(e.target.checked)} /> Animations</label>        <small>Words on screen are English. Trainer voice demos are in Hindi, with English captions.</small><button className="btn ghost" onClick={logout}>LOG OUT</button>{!real && <button className="btn ghost" onClick={() => { localStorage.removeItem(DEMO); location.href = '/' }}>RESET DEMO DATA</button>}</div>
      </>}
    </section>
    {step === 'feel' && <div className="modal"><div className="card"><h3>HOW DID IT FEEL?</h3>{(['easy', 'medium', 'hard'] as const).map(f => <button key={f} className={'opt' + (feel === f ? ' on' : '')} onClick={() => setFeel(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}<div className="quota"><small style={{ display: 'block', margin: '6px 0' }}>Optional: tick the moves where you did every rep and set.</small>{pg.exercisesIn(dayPlan(qDay ?? day).moves.map(m => m[0])).map(ex => <label key={ex} className="mo" style={{ display: 'block' }}><input type="checkbox" checked={doneEx.includes(ex)} onChange={() => toggle(doneEx, setDoneEx, ex)} /> {ex}</label>)}</div><button className="btn" disabled={!feel} onClick={finish}>CONFIRM</button><button className="btn ghost" onClick={() => { setStep(null); setFeel(null); setSym(null); setQDay(null) }}>STOP</button></div></div>}
    {step === 'symptom' && <div className="modal"><div className="card"><h3>ANY OF THESE?</h3>{([['pain', 'Pain'], ['dizziness', 'Dizziness or faintness'], ['chest', 'Chest pain or tightness'], ['breathing', 'Breathing feels unusual'], ['irregular-heartbeat', 'New irregular heartbeat'], ['none', 'None of these']] as const).map(([k, l]) => <button key={k} className={'opt' + (sym === k ? ' on' : '')} onClick={() => setSym(k)}>{l}</button>)}
      {sym === 'pain' && <div><small style={{ display: 'block', margin: '6px 0' }}>Optional: which move hurt? If you pick none, every move today is held.</small>{pg.exercisesIn(dayPlan(qDay ?? day).moves.map(m => m[0])).map(ex => <label key={ex} className="mo" style={{ display: 'block' }}><input type="checkbox" checked={painEx.includes(ex)} onChange={() => toggle(painEx, setPainEx, ex)} /> {ex}</label>)}</div>}
      {sym === 'pain' && <div className="err">Skip that exercise today. Increases for it stay on hold. If the pain keeps coming back, please get medical advice about that exercise.</div>}
      {(sym === 'dizziness' || sym === 'breathing' || sym === 'chest' || sym === 'irregular-heartbeat') && <div className="err">Stop exercising and rest. If symptoms are severe or you faint, call 112 (India) immediately. Please get medical advice before your next workout. Progression stays locked until you tell us you have spoken to a medical professional and that they said exercise is okay for you.</div>}<button className="btn" disabled={!sym} onClick={finish}>CONFIRM</button><button className="btn ghost" onClick={() => { setStep(null); setFeel(null); setSym(null); setQDay(null) }}>STOP</button></div></div>}
  </main>)
}
