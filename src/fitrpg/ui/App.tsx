// @ts-nocheck
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Link } from '@tanstack/react-router'
import { Backend, Session } from '../lib/store'
import { supabaseBackend } from '../lib/supa'
import { ROSTER, filterRoster, Hunter } from '../lib/roster'
import * as g from '../lib/game'
import { titleFor, PROFILE_TITLES, ANIME_ANCHORS, bodyBlend, bodyArt, ACCEPTED_ART_COUNT, FULLBODY } from '../lib/levels'
import { dayPlan, reviewedDayPlan } from '../lib/plan'
import * as pg from '../lib/progression'
import { recordPending, clearPending, readPending, withPending, reconcileSafety } from '../lib/safetyOutbox'
import CoreExperience from './CoreExperience'

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
  const [restoreErr, setRestoreErr] = useState(false)
  const [doneEx, setDoneEx] = useState<string[]>([]); const [painEx, setPainEx] = useState<string[]>([])
  const toggle = (arr: string[], set: (v: string[]) => void, k: string) => set(arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k])
  const [step, setStep] = useState<null | 'feel' | 'symptom'>(null)
  const [qDay, setQDay] = useState<string | null>(null) // the day the quest popup was opened for
  const [notice, setNotice] = useState('')
  const [feel, setFeel] = useState<g.Feel | null>(null)
  const [sym, setSym] = useState<g.Symptom | null>(null)

  useEffect(() => { if (step && qDay && qDay !== today()) { setStep(null); setFeel(null); setSym(null); setQDay(null); setNotice('The date changed while the quest popup was open, so it was cancelled. Nothing was awarded. Start again for today.') } }, [tk, step, qDay])
  const doRestore = () => { backend?.restore().then(r0 => { const r = r0 ? withPending(r0) : r0; setRestoreErr(false); if (r) { cachedSession = r; setS(r) } else { cachedSession = null; setS(null) } }).catch(() => setRestoreErr(true)) }
  useEffect(() => { if (cachedSession) return; doRestore() }, [])
  async function logout() { await Promise.race([saveChain.catch(() => {}), new Promise(r => setTimeout(r, 8000))]); if ((pendingSaves > 0 || saveStatus === 'failed') && !window.confirm('Your last change has not been saved to the server. If you log out now it will be lost. Log out anyway?')) return; await backend?.signOut(); sessionGen++; pendingSaves = 0; setStatus('idle'); setSaveErr(''); setNotice(''); cachedSession = null; lsSet('srf-t0', null); setS(null); setU(''); setP(''); setP2('') }
  async function auth() {
    setErr('')
    if (mode === 'up' && p !== p2) return setErr('Passwords do not match.')
    try { const r = withPending(await (mode === 'up' ? backend!.signUp(u, p) : backend!.signIn(u, p))); cachedSession = r; setS(r) } catch (e: any) { setErr(e.message) }
  }
  async function update(pr: g.Progress) { if (!s) return; const n = { ...s, progress: pr }; cachedSession = n; setS(n); setSaveErr(''); setNotice(''); const gen = sessionGen; if (backend) recordPending(s.uid, pr); pendingSaves++; setStatus('saving'); const job = saveChain.then(() => saveAny(s, { progress: pr })); saveChain = job.catch(() => {}); try { const saved = await job; if (gen !== sessionGen) return; pendingSaves--; if (pendingSaves === 0) { if (saved?.progress) { const canonical = { ...n, progress: saved.progress }; cachedSession = canonical; setS(canonical) }; setStatus('saved'); clearPending(s.uid) } } catch (e) { if (gen !== sessionGen) return; pendingSaves--; setStatus('failed'); setSaveErr(e?.message?.includes('Progress changed on another device') ? e.message : 'Could not save to the server. Check your connection and try again.'); if (backend && readPending(s.uid)) void safetyRetry(s.uid!, s.username, e?.message?.includes('Progress changed on another device')) } }
  async function safetyRetry(uid: string, username: string, conflict: boolean) { const r = await reconcileSafety(backend!, uid, username); if (r.ok && r.session) { cachedSession = r.session; setS(r.session); setStatus('saved'); setSaveErr(''); setNotice(conflict ? 'Your safety report was saved. Other changes on this device were not saved. Progress now shows the latest saved version.' : 'Your safety report was saved.') } else if (!r.ok) setSaveErr('Your safety report is not saved to the server yet. It is kept on this device and the programme stays locked here. It retries when you open the app again.') }
  useEffect(() => { if (s && s.uid && backend && readPending(s.uid)) void safetyRetry(s.uid, s.username, false); else { setSaveErr(''); setNotice('') } }, [s?.uid])
  const lv = useMemo(() => g.levelFromXp(s?.progress.xp ?? 0), [s])
  const band = Math.min(9, Math.floor((lv.level - 1) / 10))
  const [t0, setT0r] = useState<number | null>(() => { const v = Number(lsGet('srf-t0')); return v > 0 ? v : null })
  const setT0 = (v: number | null) => { setT0r(v); lsSet('srf-t0', v === null ? null : String(v)) }
  const [, tick] = useState(0)
  useEffect(() => { if (t0 === null) return; const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i) }, [t0])

  return <CoreExperience page={page} session={s} status={status} error={saveErr} notice={notice} restoreError={restoreErr}
    restore={doRestore} logout={logout} update={update} motion={motion} setMotion={setMotion} t0={t0} setT0={setT0}
    authenticate={async (username, password, signup) => {
      if (!backend) throw new Error('Account service unavailable.')
      const r = withPending(await (signup ? backend.signUp(username, password) : backend.signIn(username, password)))
      cachedSession = r; setS(r)
    }}
    chooseAvatar={async () => {
      if (!s) return
      try { await saveAny(s, { avatar: 'sung-jinwoo' }); const n = { ...s, avatar: 'sung-jinwoo' }; cachedSession = n; setS(n) }
      catch { setSaveErr('Could not save your hunter. Reload saved progress before retrying.') }
    }} />
}
