import type { Ir } from '../ir/types.ts'

/**
 * XML source set -> faithful IR.
 *
 * Input is a `filename -> XML string` map covering the `.gst` game system plus every `.cat`
 * catalogue. Pure (no fs), so the same map drives the CLI, the golden-diff harness, and any future
 * runtime path identically.
 *
 * NOT IMPLEMENTED YET. This is the scaffold's red baseline: the golden-diff harness runs, this does
 * not. Build it test-first against the BSData XML as source of truth (see CLAUDE.md).
 */
export function parseToIr(_files: Record<string, string>): Ir {
  throw new Error('parseToIr: not implemented yet (scaffold). Build XML -> IR test-first.')
}
