import { describe, it, expect } from 'vitest'
import * as F from './futureProgression'
const safe = { lock: null, holds: {} }
const obs = (day: string, extras: Partial<F.Observation> = {}): F.Observation => ({day, ex:'bridge', effort:'easy', fullQuota:true, recovery:'ok', symptom:'none', dose:[5], ...extras})
const strength = ['2026-10-27','2026-10-29','2026-10-31'], walk = ['2026-10-28','2026-10-30']
const review: F.Readiness = {recordedOn:'2026-11-02',source:'authenticated-conversation:test',informed:true, requiredStrengthDays:strength,requiredWalkDays:walk, completedStrengthDays:strength,completedWalkDays:walk,sessions:[...strength.flatMap(day => F.CORE.map(ex => obs(day,{ex}))), ...walk.map(day => obs(day,{ex:'standalone-walk',dose:[10]}))],effectiveFrom:'2026-11-03',selectedCore:['bridge','bird-dog'],secondSetsSelected:false,optionalSelected:[]}

const ready = () => F.recordReadiness(F.emptyFuture(),review)
const two = (s: F.FutureState, dose = [5], extras: Partial<F.Observation> = {}) => F.logObservation(F.logObservation(s,obs('2026-11-03',{dose,...extras})),obs('2026-11-05',{dose,...extras}))
describe('future engine: dormant design, no medical-safety claim',()=>{
 it('cannot change live baseline or apply scheduled automation',()=>{const s=two(ready());expect(F.propose(s,'bridge','2026-11-07',safe)?.after).toEqual([8]);expect(F.scheduled(s,'2026-11-07',['bridge'],safe)).toBe(s);expect(F.liveDose({...s,dose:{bridge:[12,12]}},'bridge',safe)).toEqual([5])})
 it('requires evidence, informed review, completed sessions and future effective date',()=>{for(const patch of [{source:''},{informed:false},{recordedOn:'2026-11-01'},{effectiveFrom:'2026-11-02'},{effectiveFrom:'2026-11-05'},{completedStrengthDays:[]},{completedWalkDays:[]},{completedStrengthDays:strength.slice(1)},{completedWalkDays:walk.slice(1)},{sessions:[obs('2026-10-31',{effort:'medium'})]}])expect(F.recordReadiness(F.emptyFuture(),{...review,...patch}).review).toBeNull();expect(ready().review).toEqual(review)})
 it('keeps sets and optional progression unselected',()=>{const s=ready();expect(F.ladder('bridge',false)).toEqual([[5],[8],[10],[12]]);for(const ex of F.OPTIONAL)expect(F.propose(two(s),ex,'2026-11-07',safe)).toBeNull();expect(F.ladder('calf-raise',true).at(-1)).toEqual([12]);expect(F.ladder('bottle-curl',true).at(-1)).toEqual([12]);expect(F.ladder('standalone-walk',true)).toEqual([[10],[12],[15]])})
 it('uses the specified second-set ladders and caps',()=>{expect(F.ladder('bridge',true)).toEqual([[5],[8],[10],[12],[12,5],[12,8],[12,10],[12,12]]);expect(F.ladder('bird-dog',true)).toEqual([[3],[4],[5],[6],[6,3],[6,4],[6,5],[6,6]])})
 it('blocks Medium, Hard, missing quota, symptoms, soreness and unknown recovery',()=>{for(const patch of [{effort:'medium'},{effort:'hard'},{fullQuota:false},{symptom:'pain'},{recovery:'sore'},{recovery:'unknown'}] as Partial<F.Observation>[])expect(F.propose(two(ready(),[5],patch),'bridge','2026-11-07',safe)).toBeNull()})
 it('deduplicates sessions and rejects future/same-day data and mismatched prescribed dose',()=>{let s=F.logObservation(ready(),obs('2026-11-03'));s=F.logObservation(s,obs('2026-11-03'));expect(s.observations.length).toBe(1);expect(F.propose(s,'bridge','2026-11-07',safe)).toBeNull();expect(F.propose(two(ready(),[8]),'bridge','2026-11-07',safe)).toBeNull();expect(F.propose(two(ready()),'bridge','2026-11-05',safe)).toBeNull()})
 it('preserves programme lock, exercise hold and opt out above every proposal',()=>{const s=two(ready());expect(F.propose(s,'bridge','2026-11-07',{lock:{reason:'chest'},holds:{}})).toBeNull();expect(F.propose(s,'bridge','2026-11-07',{lock:null,holds:{bridge:'x'}})).toBeNull();expect(F.propose(F.optOut(s),'bridge','2026-11-07',safe)).toBeNull()})
 it('allows one step, then cooldown and fresh sessions are required',()=>{let s=two(ready());s=F.acceptProposal(s,F.propose(s,'bridge','2026-11-07',safe)!);expect(s.dose.bridge).toEqual([8]);expect(F.propose(s,'bridge','2026-11-07',safe)).toBeNull();s=F.logObservation(F.logObservation(s,obs('2026-11-08',{dose:[8]})),obs('2026-11-10',{dose:[8]}));expect(F.propose(s,'bridge','2026-11-13',safe)).toBeNull();expect(F.propose(s,'bridge','2026-11-14',safe)?.after).toEqual([10]);expect(F.propose(s,'bridge','2026-12-01',safe)?.after).toEqual([10])})
 it('requires explicit second-set selection, full quota on both sets; regresses after two Hard or misses',()=>{let s={...ready(),review:{...review,secondSetsSelected:true},dose:{bridge:[12]}};s=two(s,[12]);expect(F.propose(s,'bridge','2026-11-07',safe)?.after).toEqual([12,5]);for(const patch of [{effort:'hard'},{fullQuota:false}] as Partial<F.Observation>[]){const r=two({...ready(),review:{...review,secondSetsSelected:true},dose:{bridge:[12,5]}},[12,5],patch);expect(F.propose(r,'bridge','2026-11-07',safe)?.after).toEqual([12])}expect(F.propose(two({...ready(),dose:{bridge:[12]}},[12]),'bridge','2026-11-07',safe)).toBeNull()})
 it('undo keeps an audit trail and cooldown; state roundtrip preserves scope',()=>{let s=two(ready());s=F.acceptProposal(s,F.propose(s,'bridge','2026-11-07',safe)!);s=F.undo(s,'2026-11-07');expect(s.dose.bridge).toEqual([5]);expect(s.changes.length).toBe(2);expect(F.undo(s,'2026-11-08')).toBe(s);expect(F.propose(s,'bridge','2026-11-07',safe)).toBeNull();expect(JSON.parse(JSON.stringify(s)).review.optionalSelected).toEqual([])})
 it('offline lifecycle: review to reps cap, second sets, regression, undo, opt-out and JSON persistence',()=>{
   let s=F.recordReadiness(F.emptyFuture(),{...review,secondSetsSelected:true})
   const dates=['2026-11-03','2026-11-05','2026-11-10','2026-11-12','2026-11-17','2026-11-19','2026-11-24','2026-11-26']
   for(let stage=0;stage<4;stage++) {
     const dose=s.dose.bridge ?? [5]
     s=F.logObservation(s,obs(dates[2*stage],{dose}))
     s=F.logObservation(s,obs(dates[2*stage+1],{dose}))
     const dt=new Date(dates[2*stage+1]+'T00:00:00Z');dt.setUTCDate(dt.getUTCDate()+2)
     const c=F.propose(s,'bridge',dt.toISOString().slice(0,10),safe)
     expect(c).not.toBeNull();s=F.acceptProposal(s,c!)
     s=JSON.parse(JSON.stringify(s))
   }
   expect(s.dose.bridge).toEqual([12,5])
   s=F.logObservation(s,obs('2026-12-01',{dose:[12,5],effort:'hard'}))
   s=F.logObservation(s,obs('2026-12-03',{dose:[12,5],effort:'hard'}))
   const c=F.propose(s,'bridge','2026-12-05',safe)!
   expect(c.after).toEqual([12]);s=F.acceptProposal(s,c)
   s=F.undo(s,'2026-12-05');expect(s.dose.bridge).toEqual([12,5]);expect(s.changes.at(-1)?.reason).toBe('undo')
   s=F.optOut(s);expect(F.propose(s,'bridge','2026-12-12',safe)).toBeNull()
   expect(F.liveDose(s,'bridge',safe)).toEqual([5])
 })

})
