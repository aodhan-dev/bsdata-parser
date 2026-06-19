import { writeFile } from 'node:fs/promises'
import { buildCatalogue } from './index.ts'
import { loadBsdata } from '../harness/oracle.ts'

/**
 * Build an output from the local BSData source using the parser and write it locally (gitignored).
 * `npm run build`. Once at parity this output replaces the downstream consumer's build step.
 */
const files = await loadBsdata()
const catalogue = buildCatalogue(files)
await writeFile('catalogue.json', JSON.stringify(catalogue))
console.log('wrote catalogue.json')
