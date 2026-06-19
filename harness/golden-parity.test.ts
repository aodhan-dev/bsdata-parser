import { describe, it, expect } from 'vitest'
import { buildCatalogue } from '../src/index.ts'
import { loadBsdata, loadOracle, hasData } from './oracle.ts'
import { diffCatalogues } from './diff.ts'

/**
 * THE acceptance test for the rebuild: parsing the BSData source must reproduce the reference
 * catalogue (as a superset). It is the red baseline today (the parser is a stub) and the green
 * target the rebuild is finished against.
 *
 * Skips automatically unless WARHOST_DATA_DIR points at a directory with the data, so the unit
 * suite runs everywhere (including public CI, which carries no game data).
 */
describe.skipIf(!hasData())('golden parity against the reference catalogue', () => {
  it('reproduces every oracle collection', async () => {
    const [files, oracle] = await Promise.all([loadBsdata(), loadOracle()])
    const candidate = buildCatalogue(files)
    const diff = diffCatalogues(oracle, candidate)
    expect(diff, JSON.stringify(diff, null, 2)).toEqual([])
  })
})
