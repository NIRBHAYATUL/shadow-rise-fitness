import {describe,it,expect} from 'vitest'
import {normalizeProg,status} from './progression'
describe('normalizeProg',()=>{
 it('fills missing fields without clearing lock or holds',()=>{const n=normalizeProg({lock:{x:1},holds:{pain:{k:1}}})!;expect(n.lock).toEqual({x:1});expect(n.holds).toEqual({pain:{k:1}});expect(n.history).toEqual([]);expect(()=>status(n)).not.toThrow();expect(status(n)).toContain('locked')})
 it('handles junk',()=>{expect(normalizeProg(null)).toBeUndefined();expect(normalizeProg([])).toBeUndefined();const n=normalizeProg({history:'x',holds:5})!;expect(n.history).toEqual([]);expect(n.holds).toEqual({})})
})
