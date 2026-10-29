import { render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ExerciseLibrary, { EXISTING_GUIDES, guideBlocked } from './ExerciseLibrary'

afterEach(cleanup)
describe('existing guide safety boundary', () => {
  it('blocks all eight guide playbacks for a locked player', () => {
    for (const guide of EXISTING_GUIDES) expect(guideBlocked(guide.id, true)).toBe(true)
    const { container } = render(<ExerciseLibrary locked />)
    expect(container.querySelector('video')).toBeNull()
  })
  it('blocks a held movement without blocking an unrelated movement', () => {
    const holds = { 'bird-dog': '2026-10-29' }
    expect(guideBlocked('bird-dog', false, holds)).toBe(true)
    expect(guideBlocked('bridge', false, holds)).toBe(false)
    const { container } = render(<ExerciseLibrary locked={false} holds={holds} />)
    expect(container.querySelector('video[src="/hindi/bird-dog-hi.mp4"]')).toBeNull()
    expect(container.querySelector('video[src="/hindi/bridge-hi.mp4"]')).not.toBeNull()
  })
})