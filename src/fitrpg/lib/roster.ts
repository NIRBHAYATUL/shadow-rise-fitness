// Roster: one avatar only (Sung Jinwoo). Art is bundled at public/avatars/sung-jinwoo.jpg (resized from a supplied avatar pack; licence unverified).
export interface Hunter { id: string; name: string; group: 'Hunter' | 'Monarch'; gender: 'M' | 'F' | '?'; note?: string }
export const ROSTER: Hunter[] = [
  { id: 'sung-jinwoo', name: 'Sung Jinwoo', group: 'Hunter', gender: 'M' },
]
export function filterRoster(f: 'all' | 'M' | 'F' | 'Hunter' | 'Monarch'): Hunter[] {
  if (f === 'all') return ROSTER
  if (f === 'M' || f === 'F') return ROSTER.filter(h => h.gender === f)
  return ROSTER.filter(h => h.group === f)
}
