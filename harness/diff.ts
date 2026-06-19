/**
 * Golden-diff core: compare a candidate output against a reference (the "oracle") and report where
 * the candidate does not yet reproduce it. Pure (no fs) and domain-agnostic, so it is unit-testable
 * on fixtures and carries no knowledge of what is being parsed.
 *
 * The contract is SUPERSET, not equality: the candidate must reproduce every field the oracle has,
 * but may carry extra fields the current consumer does not. So we walk the ORACLE's keys and flag
 * anything missing or different on the candidate; candidate-only additions are not failures.
 */

export interface DiffEntry {
  /** Top-level key into the output object. */
  path: string
  kind: 'count'
  oracle: number
  candidate: number
}

function size(v: unknown): number {
  if (Array.isArray(v)) return v.length
  if (v && typeof v === 'object') return Object.keys(v as object).length
  return v == null ? 0 : 1
}

/**
 * Top-level shape diff: for every key present in the oracle, compare element/entry counts. Keys are
 * discovered from the oracle at runtime, so this stays generic. As the projection matures, deepen
 * this to per-entity field diffs (keyed by stable id) so a single wrong value surfaces as one row.
 */
export function diffCatalogues(
  oracle: Record<string, unknown>,
  candidate: Record<string, unknown>,
): DiffEntry[] {
  const out: DiffEntry[] = []
  for (const key of Object.keys(oracle)) {
    const o = size(oracle[key])
    const c = size(candidate[key])
    if (o !== c) out.push({ path: key, kind: 'count', oracle: o, candidate: c })
  }
  return out
}

export function summarize(cat: Record<string, unknown>): Record<string, number> {
  const s: Record<string, number> = {}
  for (const key of Object.keys(cat)) s[key] = size(cat[key])
  return s
}
