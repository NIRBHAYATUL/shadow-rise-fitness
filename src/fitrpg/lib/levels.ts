// 100-level avatar progression. Every level has its own look parameters, computed in code.
// Titles are original placeholders, not claimed canon. Official art, when supplied, overrides at milestone levels.
export const MAX_LEVEL = 100
export const MILESTONES = [1, 11, 21, 31, 41, 51, 61, 71, 81, 91] as const
// User-chosen custom site ranks (not claimed canon). Level thresholds are a placeholder: 10 levels per rank.
export const TITLES = ['E-Rank', 'D-Rank', 'C-Rank', 'B-Rank', 'A-Rank', 'S-Rank', 'SS-Rank', 'SSS-Rank', 'Half Shadow Monarch', 'Full Shadow Monarch']
export function titleFor(level: number): string { return TITLES[Math.min(9, Math.floor((Math.max(1, level) - 1) / 10))]! }
export function milestoneFor(level: number): number { let m = 1; for (const x of MILESTONES) if (level >= x) m = x; return m }
export interface Look { shoulder: number; waist: number; arm: number; leg: number; lean: number; hair: number; coat: number; aura: number; marks: number; hue: number }
// Lean-athletic only: width grows slowly and caps, never bulky.
export function lookFor(level: number): Look {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level))), t = (l - 1) / 99
  return {
    shoulder: 17 + 9 * t, waist: 11 + 2.5 * t, arm: 3.2 + 2.2 * t, leg: 4.4 + 1.8 * t,
    lean: 6 - 6 * t, hair: 8 + (l % 10) * 0.6 + 8 * t, coat: Math.floor((l - 1) / 10),
    aura: l / 100, marks: l % 10, hue: 210 + 1.2 * (l - 1),
  }
}
// Profile titles seen in the game's Power of Calamity reward table (community source, not a complete catalogue).
// Unlock levels are this site's own rule, not the game's.
export const PROFILE_TITLES: { name: string; at: number }[] = [
  ['Challenger of Flames', 5], ['Firewalker', 15], ['Shadowy Survivalist', 25], ['Eyes of Fire', 35],
  ['Obsidian Overlord', 50], ['Challenger of Calamity', 65], ['Adjudicator of Calamity', 80], ['Ruler of Calamity', 95],
].map(([name, at]) => ({ name: name as string, at: at as number }))
export const ANIME_ANCHORS = ['ep01', 'ep05', 'ep09', 'ep13', 'ep19', 'ep24', 'ep25', 'ep25', 'ep25', 'ep25'] // per rank band, custom mapping
// Full-body art: 10 custom milestone panels (one per rank band). Between milestones the next panel is blended in,
// so every level shows a different image. This is a blend of two drawings, not 100 separate drawings.
export function bodyBlend(level: number): { a: number; b: number | null; mix: number; aura: number } {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level))), band = Math.floor((l - 1) / 10), step = (l - 1) % 10
  return { a: band + 1, b: band < 9 ? band + 2 : null, mix: band < 9 ? step / 10 : 0, aura: l / 100 }
}
export const FULLBODY: Record<string, string> = {}
