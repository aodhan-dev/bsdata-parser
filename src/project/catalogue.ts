import type { Ir } from '../ir/types.ts'

/**
 * IR -> downstream projection.
 *
 * Projects the faithful IR into the flattened, ready-to-consume shape the downstream application
 * needs. ALL domain interpretation lives here; the IR and parser stay domain-agnostic. The concrete
 * projector and its reference data are supplied locally and are never committed to this repo (see
 * README) -- this repo ships the framework, not any specific data model.
 *
 * "Superset" is the contract: the projection MUST reproduce every field the reference output carries
 * (so the existing consumer keeps working unchanged), and MAY add fields the current consumer lacks.
 * The golden-diff harness asserts the reproduction half; new fields are additive and ignored.
 *
 * STUB. Build it test-first against the BSData XML as source of truth (see CLAUDE.md).
 */
export function projectCatalogue(_ir: Ir): Record<string, unknown> {
  return {}
}
