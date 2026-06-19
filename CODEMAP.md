# CODEMAP — bsdata-parser

Faithful BSData → IR parser, projected into a downstream output and golden-diffed against a local
reference. Public repo: committed code is domain-agnostic; all data and domain-specific projection
is local-only (never committed).

## Layout

- `src/ir/types.ts` — BSData IR types (faithful tree mirror; nothing flattened/resolved here).
- `src/parse/index.ts` — `parseToIr(files)`: XML → IR. **STUB.**
- `src/project/catalogue.ts` — `projectCatalogue(ir)`: IR → output. Domain interpretation; **STUB**.
- `src/index.ts` — `buildCatalogue(files)` public API (signature-compatible with the consumer).
- `src/cli.ts` — `npm run build`: write a local output from the local source.
- `harness/oracle.ts` — resolve `BSDATA_DIR`; `loadBsdata()` + `loadOracle()` + `hasData()`.
- `harness/diff.ts` — `diffCatalogues(oracle, candidate)` generic superset comparison + `summarize()`.
- `harness/golden-diff.ts` — `npm run golden`: runnable diff, prints the gap, exits non-zero on gaps.
- `harness/diff.test.ts` — unit tests for the diff logic (neutral fixtures).
- `harness/golden-parity.test.ts` — THE acceptance test (red until the rebuild reaches parity;
  auto-skips unless `BSDATA_DIR` is set).

## Commands

- `npm test` / `npm run golden` / `npm run build` / `npm run typecheck`.

## Gotchas

- No data is committed (`.gitignore`); supply it locally via `BSDATA_DIR`.
- `.ts` extension imports need `allowImportingTsExtensions` (set); tsx runs them directly.
- Superset, not equality: candidate-only fields are NOT diff failures (see `diff.ts`).
- Diff keys are discovered from the oracle at runtime — the engine hardcodes no domain terms.
