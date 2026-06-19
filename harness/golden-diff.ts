import { buildCatalogue } from '../src/index.ts'
import { loadBsdata, loadOracle } from './oracle.ts'
import { diffCatalogues, summarize } from './diff.ts'

/**
 * Runnable golden diff: parse the local BSData source with the rebuild, diff against the local
 * reference output, print the gap. `npm run golden`. Exits non-zero while gaps remain so it can
 * gate CI once the rebuild is meant to be at parity.
 */
async function main() {
  const [files, oracle] = await Promise.all([loadBsdata(), loadOracle()])
  let candidate: Record<string, unknown>
  try {
    candidate = buildCatalogue(files)
  } catch (err) {
    console.error('rebuild parser threw (expected while scaffolded):')
    console.error('  ' + (err as Error).message)
    process.exit(1)
  }

  const diff = diffCatalogues(oracle, candidate)
  console.log('oracle  :', JSON.stringify(summarize(oracle)))
  console.log('candidate:', JSON.stringify(summarize(candidate)))
  if (diff.length === 0) {
    console.log('\nGOLDEN: candidate reproduces the oracle. ✔')
    process.exit(0)
  }
  console.log(`\n${diff.length} gap(s):`)
  for (const d of diff) console.log(`  ${d.path}: oracle=${d.oracle} candidate=${d.candidate}`)
  process.exit(1)
}

main()
