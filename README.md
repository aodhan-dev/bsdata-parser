# bsdata-parser

A faithful parser for [BSData](https://github.com/BSData) XML into an intermediate representation
(IR), plus a golden-diff harness for validating a downstream projection of that IR against a
reference output.

The parser exists to replace a **lossy** flatten: a naive parser drops conditions in the source it
cannot statically resolve, which is the root cause of recurring "missing option" bugs in the
downstream consumer. The rebuild keeps those conditions in the IR and resolves them in the projection.

## Design

```
BSData (.gst/.cat)  ──parse──▶  IR (faithful tree)  ──project──▶  output
                                                                     │
                                       reference output  ◀──diff─────┘  (oracle)
```

- **`src/parse`** — XML → IR. Mechanical transcription, domain-agnostic, no interpretation. *(stub)*
- **`src/project`** — IR → output. All domain interpretation lives here. Supplied locally. *(stub)*
- **`src/index.ts`** — `buildCatalogue(files)`, signature-compatible with the downstream consumer
  for incremental integration.
- **`harness/`** — the golden diff. `loadOracle()`/`loadBsdata()` read from a local data directory;
  `diffCatalogues()` asserts the candidate reproduces the reference as a superset.

## Data (local only, never committed)

No data is bundled with this repo. The BSData source files and the reference output are third-party
content you assemble yourself. Point the `BSDATA_DIR` environment variable at a local directory
containing:

- `bsdata/` — the `.cat`/`.gst` source set (input to the parser)
- `catalogue.json` — a reference output (the oracle to diff against)

Everything under that directory stays outside the repo. The concrete domain projector you plug into
`src/project` is likewise kept local (gitignored), so nothing data- or domain-specific is published.

## Commands

- `npm test` — unit suite plus the golden-parity test (auto-skips unless `BSDATA_DIR` is set,
  so it runs cleanly anywhere, including CI with no data).
- `npm run golden` — run the golden diff against the local reference and print the gap.
- `npm run build` — build a local output from the local source with the parser.
- `npm run typecheck` — `tsc --noEmit`.

## Status

Scaffold. `parseToIr`/`projectCatalogue` are stubs, so the golden-parity test is **red by design** —
that is the baseline the rebuild is built green against, test-first.

## Method

TDD against the BSData XML as the source of truth: establish the expected value from the `.cat`/`.gst`
before writing the assertion. The golden diff is the integration oracle; per-entity unit tests are
the inner loop.
