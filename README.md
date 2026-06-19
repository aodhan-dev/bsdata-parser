# bsdata-parser

A faithful, typed parser for [BSData](https://github.com/BSData) `.gst`/`.cat` XML game-data files into a typed Intermediate Representation (IR), plus a golden-diff harness for validating a downstream projection against a reference output.

[![CI](https://github.com/aodhan-dev/bsdata-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/aodhan-dev/bsdata-parser/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/bsdata-parser)](https://www.npmjs.com/package/bsdata-parser)

## Why

Naive BSData parsers flatten the XML as they go, silently dropping modifiers and conditions they cannot statically resolve. The result is recurring "missing option" bugs whenever BSData's conditional logic kicks in. This library solves that by keeping the full modifier/condition tree in the IR and leaving resolution to the projection layer.

## Architecture

```
BSData (.gst/.cat)  ──parse──▶  IR (faithful tree)  ──project──▶  your output
                                                                        │
                                       reference output  ◀───diff───────┘
```

- **`src/parse`** - XML to IR. Mechanical transcription only: no interpretation, no flattening, no domain knowledge. Every modifier, condition, constraint, and repeat node is preserved verbatim.
- **`src/project`** - IR to output. All domain interpretation lives here. This layer is intentionally not included in the package - you supply it, shaped to your own output schema.
- **`harness/`** - golden-diff utilities. Load a reference output (oracle) and diff a candidate against it to find gaps. Auto-skips when no local data is present, so the test suite runs cleanly everywhere.

## Installation

```bash
npm install bsdata-parser
```

## Usage

```typescript
import { parseToIr } from 'bsdata-parser'
import type { Ir } from 'bsdata-parser'

// 1. Load your .gst/.cat files however you like (fs, fetch, etc.)
const files: Record<string, string> = {
  'my-game.gst': '<gameSystem ...>...</gameSystem>',
  'faction-a.cat': '<catalogue ...>...</catalogue>',
}

// 2. Parse to IR - faithful, lossless, typed
const ir: Ir = parseToIr(files)

// 3. Project to your output schema
const output = myProjector(ir)
```

`parseToIr` accepts a `filename -> XML string` map and returns an `Ir` object containing the fully parsed game system and all catalogues as typed trees.

## IR shape

```typescript
interface Ir {
  gameSystem: IrCatalogueFile   // the .gst file
  catalogues: IrCatalogueFile[] // all .cat files
}

interface IrCatalogueFile {
  filename: string
  kind: 'gameSystem' | 'catalogue'
  id: string
  name: string
  gameSystemId?: string
  catalogueLinks: IrCatalogueLink[]
  root: IrCatalogueRoot
}

interface IrCatalogueRoot {
  costTypes: IrCostType[]
  profileTypes: IrProfileType[]
  categoryEntries: IrCategoryEntry[]
  rules: IrRule[]
  sharedRules: IrRule[]
  sharedProfiles: IrProfile[]
  selectionEntries: IrSelectionEntry[]
  sharedSelectionEntries: IrSelectionEntry[]
  sharedSelectionEntryGroups: IrSelectionEntryGroup[]
  entryLinks: IrEntryLink[]
  forceEntries: IrForceEntry[]
}
```

All node types (`IrSelectionEntry`, `IrConstraint`, `IrModifier`, `IrCondition`, etc.) are exported from the package. See `src/ir/types.ts` for the complete set.

## Writing a projector

A projector is a function `(ir: Ir) => YourOutputType`. It lives in your own codebase and is never part of this package:

```typescript
import { parseToIr } from 'bsdata-parser'
import type { Ir } from 'bsdata-parser'

function projectMyGame(ir: Ir): MyOutput {
  const categories: Record<string, string> = {}
  for (const entry of ir.gameSystem.root.categoryEntries) {
    categories[entry.id] = entry.name
  }

  const units = ir.catalogues.flatMap(cat =>
    cat.root.sharedSelectionEntries
      .filter(e => e.type === 'unit' && !e.hidden)
      .map(e => ({ id: e.id, name: e.name, faction: cat.name }))
  )

  return { categories, units }
}

export function buildOutput(files: Record<string, string>): MyOutput {
  return projectMyGame(parseToIr(files))
}
```

## Golden-diff harness

The harness lets you validate that your projector reproduces a known-good reference output as a superset. It is domain-agnostic and works for any BSData game system.

Set `BSDATA_DIR` to a local directory containing:
- `bsdata/` - the `.cat`/`.gst` source files
- `catalogue.json` - a reference output to diff against

```typescript
// harness/golden-parity.test.ts (in your project)
import { describe, it, expect } from 'vitest'
import { loadBsdata, loadOracle, hasData } from 'bsdata-parser/harness' // if re-exported
import { diffCatalogues } from 'bsdata-parser/harness'
import { buildOutput } from './my-projector'

describe.skipIf(!hasData())('golden parity', () => {
  it('reproduces every oracle collection', async () => {
    const [files, oracle] = await Promise.all([loadBsdata(), loadOracle()])
    const candidate = buildOutput(files)
    expect(diffCatalogues(oracle, candidate)).toEqual([])
  })
})
```

## Data and domain code (never committed)

No game data is bundled here. BSData source files are third-party content you assemble yourself. Your projector is likewise kept local - nothing data- or domain-specific should be published.

## Commands

| Command | Description |
|---------|-------------|
| `npm test` | Unit suite + golden-parity test (auto-skips without `BSDATA_DIR`) |
| `npm run build` | Compile to `dist/` via tsup |
| `npm run typecheck` | `tsc --noEmit` |

## License

MIT
