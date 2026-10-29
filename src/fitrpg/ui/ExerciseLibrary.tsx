import { BookOpen, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const EXISTING_GUIDES = [
  { id: 'room-walk', name: 'Room walk or march', file: 'room-walk', cue: 'Easy pace; short blocks are fine.' },
  { id: 'mini-squat', name: 'Mini-squat', file: 'mini-squat', cue: 'Controlled pain-free range. Knees track over toes; feet grounded.' },
  { id: 'bridge', name: 'Bridge', file: 'bridge', cue: 'Floor moves are optional if getting down is uncomfortable.' },
  { id: 'wall-push-up', name: 'Wall push-up', file: 'wall-pushup', cue: 'Use a stable wall; keep the movement controlled.' },
  { id: 'bird-dog', name: 'Single-limb bird-dog', file: 'bird-dog', cue: 'One arm OR one leg at a time, never a diagonal pair.' },
  { id: 'calf-raise', name: 'Optional calf raise', file: 'calf-raise', cue: 'Optional only; follow today’s prescribed dose.' },
  { id: 'bottle-curl', name: 'Optional plastic-bottle curl', file: 'bottle-curl', cue: 'Light plastic bottle only; no load increase from XP.' },
  { id: 'cool-down', name: 'Cool-down: slow walk', file: 'cool-down', cue: 'Slow walk; follow today’s cool-down time.' },
] as const

export function guideBlocked(id: string, locked: boolean, holds: Record<string, unknown> = {}) {
  return locked || Boolean(holds[id])
}

export default function ExerciseLibrary({ locked, holds = {} }: { locked: boolean; holds?: Record<string, unknown> }) {
  return <section id="exercise-library" className="dark srf-library" aria-labelledby="library-heading">
    <header><div><span className="tag">MOVEMENT REFERENCE</span><h2 id="library-heading"><BookOpen size={22} aria-hidden="true" /> Exercise Library</h2></div><span className="srf-guide-count">8 existing guides</span></header>
    <p>Today’s workout is separate. These references do not add exercises, sets or load to your plan.</p>
    <p className="srf-library-note">Existing local schematic guides — not new synchronized front/side motion. Hindi audio and English captions have not been re-verified.</p>
    {locked && <p role="status" className="srf-library-stop"><ShieldAlert size={20} aria-hidden="true" /> Playback paused after your safety report. Stop exercising and get medical advice before your next workout.</p>}
    <div className="srf-guide-grid">{EXISTING_GUIDES.map(guide => {
      const blocked = guideBlocked(guide.id, locked, holds)
      return <article key={guide.id} className="srf-guide"><span className="tag">EXISTING LOCAL GUIDE</span><h3>{guide.name}</h3><p>{guide.cue}</p>
        {blocked ? <p className="srf-library-stop">{locked ? 'Playback unavailable while locked.' : 'This movement is on hold. Playback unavailable.'}</p> : <details><summary>Open existing guide</summary><video aria-label={`${guide.name} existing guide`} controls playsInline preload="none" src={`/hindi/${guide.file}-hi.mp4`} /></details>}
      </article>
    })}</div>
    <Button variant="outline" asChild><a href="#top">Back to navigation</a></Button>
  </section>
}