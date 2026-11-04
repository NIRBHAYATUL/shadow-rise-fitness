import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import manifest from '../../../public/body/art-manifest.json'
import { bodyArt, ACCEPTED_ART_COUNT, DISTINCT_ART_LEVELS } from './levels'
describe('truthful partial art registry', () => {
 it('has 41 distinct files without rounding unfinished levels forward', () => {
 expect(ACCEPTED_ART_COUNT).toBe(41)
 const all = Array.from({length:100},(_,i)=>bodyArt(i+1))
 expect(new Set(all.map(a=>a.src)).size).toBe(41)
 expect(all.filter(a=>a.distinct)).toHaveLength(41)
 expect(bodyArt(6).src).toBe('/body/level-006.webp')
 expect(bodyArt(20)).toEqual({src:'/body/level-020.webp',distinct:true,artLevel:20})
 expect(bodyArt(25)).toEqual({src:'/body/level-025.webp',distinct:true,artLevel:25})
 expect(bodyArt(30)).toEqual({src:'/body/level-030.webp',distinct:true,artLevel:30})
 expect(bodyArt(36)).toEqual({src:'/body/jinwoo-04.webp',distinct:false,artLevel:31})
 expect(bodyArt(100)).toEqual({src:'/body/jinwoo-10.webp',distinct:false,artLevel:91})
 })
 it.each([32,33,34,35])('selects the genuine level %i drawing', level => {
 expect(bodyArt(level)).toEqual({src:`/body/level-${String(level).padStart(3,'0')}.webp`,distinct:true,artLevel:level})
 })
 it('matches the registry and manifest to actual distinct file checksums', () => {
 expect(manifest.accepted_count).toBe(41)
 expect(manifest.entries.map(entry=>entry.level)).toEqual([...DISTINCT_ART_LEVELS])
 const hashes = manifest.entries.map(entry => {
 const hash = createHash('sha256').update(readFileSync(resolve('public', `.${entry.src}`))).digest('hex')
 expect(hash).toBe(entry.sha256)
 expect(bodyArt(entry.level).src).toBe(entry.src)
 return hash
 })
 expect(new Set(hashes).size).toBe(41)
 })
})
