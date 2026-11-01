import type { Feel, Progress } from '../lib/game'
import { XP_CHECKIN, XP_PER_QUEST } from '../lib/game'
import { dayPlan } from '../lib/plan'

// Cosmetic completion only. Never manufacture a symptom answer or a readiness observation.
export function confirmTarget(progress: Progress, day: string, feedback: Feel | null): Progress {
  if (!feedback || progress.prog?.lock || progress.pending?.symptom && progress.pending.symptom !== 'none' || dayPlan(day).kind !== 'train') return progress
  if (progress.doneDays.includes(day) || progress.doneDays.includes(`rest:${day}`)) return progress
  return { ...progress, xp: progress.xp + XP_PER_QUEST + XP_CHECKIN, doneDays: [...progress.doneDays, day], pending: null }
}