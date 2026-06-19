import { parseToIr } from './parse/index.ts'
import { projectCatalogue } from './project/catalogue.ts'

/**
 * Public entry point. `filename -> XML` map in, projected output object out. The signature matches
 * the downstream consumer's existing build step so this can be wired in incrementally (swap the
 * import, keep the golden diff green) without touching the consumer.
 */
export function buildCatalogue(files: Record<string, string>): Record<string, unknown> {
  const ir = parseToIr(files)
  return projectCatalogue(ir)
}

export { parseToIr } from './parse/index.ts'
export { projectCatalogue } from './project/catalogue.ts'
export type { Ir, IrCatalogueFile, IrModifierGroup } from './ir/types.ts'
