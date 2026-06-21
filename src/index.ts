import { parseToIr } from './parse/index'
import { projectCatalogue } from './project/catalogue'

/**
 * Public entry point. `filename -> XML` map in, projected output object out. The signature matches
 * the downstream consumer's existing build step so this can be wired in incrementally (swap the
 * import, keep the golden diff green) without touching the consumer.
 */
export function buildCatalogue(files: Record<string, string>): Record<string, unknown> {
  const ir = parseToIr(files)
  return projectCatalogue(ir)
}

export { parseToIr } from './parse/index'
export { projectCatalogue } from './project/catalogue'
export type { Ir, IrCatalogueFile, IrModifierGroup } from './ir/types'
