# CODEMAP — bsdata-parser

Faithful BSData → IR parser, projected into a downstream output and golden-diffed against a local
reference. Published to npm as `bsdata-parser`. Public repo: committed code is domain-agnostic; all
data and domain-specific projection is local-only (never committed).

Current published version: **0.1.3** (tsup-bundled ESM + types). `main` matches the published package.

## Layout

- `src/ir/types.ts` — BSData IR types (faithful tree mirror; nothing flattened/resolved here).
  `IrEntryLink` preserves the `flatten` attribute (consumers honor it when inlining group links).
- `src/parse/xml.ts` — the XML → IR node parsers (`fast-xml-parser` + per-node mappers). Mechanical,
  domain-agnostic; preserves ids, attributes (incl. `flatten`), constraints, modifiers, conditions.
- `src/parse/index.ts` — `parseToIr(files)`: `filename → XML` map → faithful `Ir`. Pure (no fs).
- `src/parse/parse.test.ts` — per-node unit tests over inline XML fixtures (no `BSDATA_DIR` needed).
- `src/project/catalogue.ts` — `projectCatalogue(ir)`: IR → output. Domain interpretation; **local-only
  STUB** (skip-worktree; the real projector is supplied locally and never committed).
- `src/index.ts` — public API: `buildCatalogue(files)`, `parseToIr`, `projectCatalogue`
  (signature-compatible with the downstream consumer's existing build step).
- `src/cli.ts` — standalone local build (`tsx src/cli.ts`): write a local output from the local source.
- `harness/oracle.ts` — resolve `BSDATA_DIR`; `loadBsdata()` + `loadOracle()` + `hasData()`.
- `harness/diff.ts` — `diffCatalogues(oracle, candidate)` generic superset comparison + `summarize()`.
- `harness/golden-diff.ts` — `npm run golden`: runnable diff, prints the gap, exits non-zero on gaps.
- `harness/diff.test.ts` — unit tests for the diff logic (neutral fixtures).
- `harness/golden-parity.test.ts` — acceptance test against the local oracle (auto-skips unless
  `BSDATA_DIR` is set).

## Build & publish

- `npm run build` — **tsup** → `dist/index.js` (single bundled ESM, no relative imports) + `dist/index.d.ts`
  + sourcemap (config in `tsup.config.ts`, dts via `tsconfig.build.json`). `files: ["dist"]`.
- Publish is **tag-triggered**: pushing a `v*` tag runs `.github/workflows/publish.yml`
  (typecheck → test → build → `npm publish --provenance`) using the `NPM_TOKEN` repo secret.
  Do NOT publish locally — `prepublishOnly` guards against the skip-worktree `project/catalogue.ts`.
- Deprecate a version via `.github/workflows/deprecate.yml` (`workflow_dispatch`, inputs
  `version` + `message`); runs `npm deprecate` with the same `NPM_TOKEN`. Used to deprecate 0.1.2
  (broken unbundled-ESM publish; superseded by 0.1.3).
- `.github/workflows/ci.yml` — typecheck + test on push/PR (node 20/22).

## Commands

- `npm test` / `npm run golden` / `npm run build` / `npm run typecheck`.

## Gotchas

- No data is committed (`.gitignore`); supply it locally via `BSDATA_DIR`.
- `.ts` extension imports are used throughout; tsup bundles them, tsx runs them directly.
- Build with **tsup (bundler)**, not bare `tsc` emit — a multi-file `tsc` build emits extensionless
  relative imports that break Node's ESM resolver (this was the 0.1.2 bug; 0.1.3 re-bundled with tsup).
- Superset, not equality: candidate-only fields are NOT diff failures (see `diff.ts`).
- Diff keys are discovered from the oracle at runtime — the engine hardcodes no domain terms.
- `project/catalogue.ts` is skip-worktree (local real projector); never commit local changes to it.
