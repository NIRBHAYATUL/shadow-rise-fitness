import { describe, it, expect } from 'vitest'
import { bodyArt, ACCEPTED_ART_COUNT } from './levels'
describe('truthful partial art registry', () => {
 it('has19distinctfiles without rounding unfinished levels forward', () => {
 expect(ACCEPTED_ART_COUNT).toBe(19)
 const all = Array.from({length:100},(_,i)=>bodyArt(i+1))
 expect(new Set(all.map(a=>a.src)).size).toBe(19)
 expect(all.filter(a=>a.distinct)).toHaveLength(19)
 expect(bodyArt(6).src).toBe('/body/level-006.webp')
 expect(bodyArt(20)).toEqual({src:'/body/jinwoo-02.webp',distinct:false,artLevel:11})
 expect(bodyArt(100)).toEqual({src:'/body/jinwoo-10.webp',distinct:false,artLevel:91})
 })
})
