// Roster: art is bundled at public/avatars/<id>.jpg (official/wiki images supplied by the avatar pack, resized).
// Characters with no usable image (Seo Jiwoo, Hyeonmoo Gang, Choi Hasul) are left out on purpose.
export interface Hunter { id: string; name: string; group: 'Hunter' | 'Monarch'; gender: 'M' | 'F' | '?'; note?: string }
export const ROSTER: Hunter[] = [
  { id: 'akari-shimizu', name: 'Akari Shimizu', group: 'Hunter', gender: 'F' },
  { id: 'antares', name: 'Antares', group: 'Monarch', gender: 'M' },
  { id: 'ashborn', name: 'Ashborn', group: 'Monarch', gender: 'M' },
  { id: 'atsushi-kumamoto', name: 'Atsushi Kumamoto', group: 'Hunter', gender: 'M' },
  { id: 'baek-yoonho', name: 'Baek Yoonho', group: 'Hunter', gender: 'M' },
  { id: 'baran', name: 'Baran', group: 'Monarch', gender: '?' },
  { id: 'cha-hae-in', name: 'Cha Hae-In', group: 'Hunter', gender: 'F' },
  { id: 'choi-jong-in', name: 'Choi Jong-In', group: 'Hunter', gender: 'M' },
  { id: 'christopher-reed', name: 'Christopher Reed', group: 'Hunter', gender: 'M' },
  { id: 'go-gunhee', name: 'Go Gunhee', group: 'Hunter', gender: 'M' },
  { id: 'goto-ryuji', name: 'Goto Ryuji', group: 'Hunter', gender: 'M' },
  { id: 'hwang-dongsoo', name: 'Hwang Dongsoo', group: 'Hunter', gender: 'M' },
  { id: 'ippei-izawa', name: 'Ippei Izawa', group: 'Hunter', gender: 'M' },
  { id: 'kanae-tawata', name: 'Kanae Tawata', group: 'Hunter', gender: 'F' },
  { id: 'kei', name: 'Kei', group: 'Hunter', gender: 'M' },
  { id: 'kenzo-tanaka', name: 'Kenzo Tanaka', group: 'Hunter', gender: 'M' },
  { id: 'lee-eunseok', name: 'Lee Eunseok', group: 'Hunter', gender: 'M' },
  { id: 'legia', name: 'Legia', group: 'Monarch', gender: '?' },
  { id: 'lim-tae-gyu', name: 'Lim Tae-Gyu', group: 'Hunter', gender: 'M' },
  { id: 'ma-dongwook', name: 'Ma Dongwook', group: 'Hunter', gender: 'M' },
  { id: 'mari-ishida', name: 'Mari Ishida', group: 'Hunter', gender: 'F' },
  { id: 'min-byung-gyu', name: 'Min Byung-Gyu', group: 'Hunter', gender: 'M' },
  { id: 'minoru-hoshino', name: 'Minoru Hoshino', group: 'Hunter', gender: 'M' },
  { id: 'querehsha', name: 'Querehsha', group: 'Monarch', gender: 'F' },
  { id: 'rakan', name: 'Rakan', group: 'Monarch', gender: 'M' },
  { id: 'reiji-sugimoto', name: 'Reiji Sugimoto', group: 'Hunter', gender: 'M' },
  { id: 'sillad', name: 'Sillad', group: 'Monarch', gender: 'M' },
  { id: 'sung-jinwoo', name: 'Sung Jinwoo', group: 'Hunter', gender: 'M' },
  { id: 'sung-suho', name: 'Sung Suho', group: 'Hunter', gender: 'M', note: 'Ragnarok (not main series)' },
  { id: 'tarnak', name: 'Tarnak', group: 'Monarch', gender: 'M' },
  { id: 'tatsumi-fujishima', name: 'Tatsumi Fujishima', group: 'Hunter', gender: 'M' },
  { id: 'thomas-andre', name: 'Thomas Andre', group: 'Hunter', gender: 'M' },
  { id: 'yogumunt', name: 'Yogumunt', group: 'Monarch', gender: 'M' },
]
export function filterRoster(f: 'all' | 'M' | 'F' | 'Hunter' | 'Monarch'): Hunter[] {
  if (f === 'all') return ROSTER
  if (f === 'M' || f === 'F') return ROSTER.filter(h => h.gender === f)
  return ROSTER.filter(h => h.group === f)
}
