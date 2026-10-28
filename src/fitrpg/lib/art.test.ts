import { describe, it, expect } from 'vitest'
import { bodyArt, ACCEPTED_ART_COUNT } from './levels'
describe('truthful partial art registry', () => {
 it('has32distinctfiles without rounding unfinished levels forward', () => {
 expect(ACCEPTED_ART_COUNT).toBe(32)
 const all = Array.from({length:100},(_,i)=>bodyArt(i+1))
 expect(new Set(all.map(a=>a.src)).size).toBe(32)
 expect(all.filter(a=>a.distinct)).toHaveLength(32)
 expect(bodyArt(6).src).toBe('/body/level-006.webp')
 expect(bodyArt(20)).toEqual({src:'/body/level-020.webp',distinct:true,artLevel:20})
 expect(bodyArt(25)).toEqual({src:'/body/level-025.webp',distinct:true,artLevel:25})
 expect(bodyArt(26)).toEqual({src:'/body/jinwoo-03.webp',distinct:false,artLevel:21})
 expect(bodyArt(100)).toEqual({src:'/body/jinwoo-10.webp',distinct:false,artLevel:91})
 })
})
