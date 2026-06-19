import { describe, it, expect } from 'vitest'
import { diffCatalogues, summarize } from './diff.ts'

describe('diffCatalogues (superset contract)', () => {
  it('reports no gaps when the candidate matches the oracle', () => {
    const cat = { alpha: [{ id: 'a' }], beta: [], gamma: { x: 'X' } }
    expect(diffCatalogues(cat, cat)).toEqual([])
  })

  it('flags a collection the candidate has not populated', () => {
    const oracle = { alpha: [{ id: 'a' }, { id: 'b' }] }
    const candidate = { alpha: [] }
    const diff = diffCatalogues(oracle, candidate)
    expect(diff).toHaveLength(1)
    expect(diff[0]).toMatchObject({ path: 'alpha', kind: 'count', oracle: 2, candidate: 0 })
  })

  it('ignores candidate-only additions (superset, not equality)', () => {
    const oracle = { alpha: [{ id: 'a' }] }
    const candidate = { alpha: [{ id: 'a' }], extraField: [1, 2, 3] }
    expect(diffCatalogues(oracle, candidate)).toEqual([])
  })

  it('summarizes top-level sizes', () => {
    expect(summarize({ alpha: [1, 2], gamma: { a: 'A' } })).toEqual({ alpha: 2, gamma: 1 })
  })
})
