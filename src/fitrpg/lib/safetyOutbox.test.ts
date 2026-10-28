import {describe,it,expect,beforeEach,vi} from 'vitest'
import {recordPending,readPending,clearPending,mergeSafety,reconcileSafety,withPending} from './safetyOutbox'
const store:Record<string,string>={}
beforeEach(()=>{for(const k of Object.keys(store))delete store[k];(globalThis as any).localStorage={getItem:(k:string)=>store[k]??null,setItem:(k:string,v:string)=>{store[k]=v},removeItem:(k:string)=>{delete store[k]}}})
const P=(prog:any,xp=0)=>({xp,doneDays:[],pending:null,prog}) as any
describe('safety outbox',()=>{
 it('records only when a lock or hold exists, and survives a reload (localStorage)',()=>{recordPending('u',P(undefined));expect(readPending('u')).toBeNull();recordPending('u',P({lock:{since:'2026-10-28',reason:'dizziness'},holds:{}}));expect(readPending('u')?.lock).toEqual({since:'2026-10-28',reason:'dizziness'})})
 it('merge only adds: server lock/holds win, nothing is cleared',()=>{const m=mergeSafety(P({lock:{reason:'chest'},holds:{a:'d1'}}),{lock:{reason:'dizziness'},holds:{b:'d2'}});expect((m.prog as any).lock).toEqual({reason:'chest'});expect((m.prog as any).holds).toEqual({b:'d2',a:'d1'});const none=mergeSafety(P({lock:null,holds:{}}),null);expect((none.prog as any).lock).toBeNull()})
 it('adds a lost lock to fresh server state that lacks it',()=>{const m=mergeSafety(P(undefined,500),{lock:{reason:'breathing'},holds:{}});expect((m.prog as any).lock).toEqual({reason:'breathing'});expect(m.xp).toBe(500)})
 it('withPending locks the displayed session after reload even before any network',()=>{recordPending('u',P({lock:{reason:'chest'},holds:{}}));const s=withPending({username:'u',avatar:null,progress:P(undefined,5)});expect((s.progress.prog as any).lock).toEqual({reason:'chest'})})
 it('reconcile: reloads latest, merges flag, does NOT replay stale xp, retries after a conflict, then clears',async()=>{
  recordPending('u',P({lock:{reason:'dizziness'},holds:{}},10));
  const saves:any[]=[];let n=0
  const b:any={restore:vi.fn(async()=>({username:'u',avatar:null,progress:P({holds:{}},999)})),save:vi.fn(async(_u:string,patch:any)=>{saves.push(patch);if(++n===1)throw new Error('SRF_CONFLICT'.replace('SRF_CONFLICT','Progress changed on another device. x'));return {progress:patch.progress}})}
  const r=await reconcileSafety(b,'u');expect(r.ok).toBe(true);expect(b.save).toHaveBeenCalledTimes(2);expect(saves[1].progress.xp).toBe(999);expect(saves[1].progress.prog.lock).toEqual({reason:'dizziness'});expect(readPending('u')).toBeNull()})
 it('reconcile keeps the pending flag when saving fails (offline)',async()=>{recordPending('u',P({lock:{reason:'chest'},holds:{}}));const b:any={restore:async()=>({username:'u',avatar:null,progress:P({})}),save:async()=>{throw new Error('offline')}};const r=await reconcileSafety(b,'u');expect(r.ok).toBe(false);expect(readPending('u')?.lock).toEqual({reason:'chest'})})
})
