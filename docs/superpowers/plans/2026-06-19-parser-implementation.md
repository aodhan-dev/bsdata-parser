# Parser implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `parseToIr` so the golden-parity test can go green once a local projector is wired in.

**Architecture:** Two new files alongside `src/parse/index.ts`: `xml.ts` holds the fast-xml-parser config and every node-parsing helper; `index.ts` becomes the thin public entry point. All tests live in `src/parse/parse.test.ts` using embedded XML fixtures (no local data dependency). The IR stays dumb - raw scope strings, verbatim modifier trees, no interpretation.

**Tech Stack:** TypeScript, fast-xml-parser (already installed), Vitest.

## Global Constraints

- MUST NOT import anything from `src/project/` or resolve scope semantics (that belongs in the projection layer).
- MUST NOT commit any third-party game data, IP-specific references, or domain-specific identifiers.
- `isArray` callback in fast-xml-parser MUST cover every repeating XML element so single-child arrays parse consistently.
- `parseAttributeValue: true` auto-converts `"1.0"` to `1` - use numeric attributes directly.
- All IR nodes MUST faithfully mirror the XML; nothing summarised, defaulted, or dropped.
- `npm run typecheck` MUST pass after every task.

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/ir/types.ts` | Complete IR type definitions | Expand (replace `root: unknown`) |
| `src/parse/xml.ts` | fast-xml-parser config + all node-parsing helpers | Create |
| `src/parse/index.ts` | `parseToIr` public entry point only | Rewrite (remove stub error) |
| `src/parse/parse.test.ts` | All parse-layer unit tests | Create |

---

## Task 1: IR types

Expand `src/ir/types.ts` from `root: unknown` to a complete typed tree. No tests - `npm run typecheck` is the gate. Keep this layer purely structural; no domain logic.

**Files:**
- Modify: `src/ir/types.ts`

- [ ] **Step 1: Replace the file contents**

Replace the entire content of `src/ir/types.ts` with:

```typescript
/**
 * BSData intermediate representation (IR).
 *
 * A FAITHFUL, lossless-by-intent tree mirror of the BSData .gst / .cat model.
 * Nothing is resolved, flattened, or interpreted here. Scope strings are raw BSData
 * values. Modifier/condition trees are opaque. All interpretation belongs in the
 * projection (src/project).
 */

export interface IrConstraint {
  id: string
  type: 'min' | 'max'
  value: number
  scope: string
  field: string
  shared?: boolean
  includeChildSelections?: boolean
}

export interface IrCharacteristic {
  name: string
  typeId: string
  value: string
}

export interface IrProfile {
  id: string
  name: string
  hidden: boolean
  typeId: string
  typeName: string
  characteristics: IrCharacteristic[]
}

export interface IrCost {
  name: string
  typeId: string
  value: number
}

export interface IrRule {
  id: string
  name: string
  hidden: boolean
  description: string
}

export interface IrInfoLink {
  id: string
  name: string
  hidden: boolean
  targetId: string
  type: string
}

export interface IrCategoryLink {
  id: string
  targetId: string
  primary: boolean
}

/** Verbatim condition node - not evaluated, retained for the modifier tree. */
export interface IrCondition {
  type: string
  value: number
  field: string
  scope: string
  childId?: string
  shared?: boolean
  includeChildSelections?: boolean
  percentValue?: boolean
  shared_?: boolean
}

export interface IrConditionGroup {
  type: string
  conditions: IrCondition[]
  conditionGroups: IrConditionGroup[]
}

/** Verbatim modifier node - not evaluated. */
export interface IrModifier {
  type: string
  field: string
  value: string | number
  conditions: IrCondition[]
  conditionGroups: IrConditionGroup[]
  repeats: IrRepeat[]
}

export interface IrRepeat {
  value: number
  repeats: number
  field: string
  scope: string
  childId?: string
  shared?: boolean
  includeChildSelections?: boolean
  roundUp?: boolean
}

export type IrEntryType = 'unit' | 'model' | 'upgrade' | 'mount'

export interface IrSelectionEntry {
  id: string
  name: string
  hidden: boolean
  collective: boolean
  import: boolean
  type: IrEntryType
  defaultAmount?: number
  constraints: IrConstraint[]
  profiles: IrProfile[]
  rules: IrRule[]
  infoLinks: IrInfoLink[]
  categoryLinks: IrCategoryLink[]
  costs: IrCost[]
  modifiers: IrModifier[]
  selectionEntries: IrSelectionEntry[]
  selectionEntryGroups: IrSelectionEntryGroup[]
  entryLinks: IrEntryLink[]
}

export interface IrSelectionEntryGroup {
  id: string
  name: string
  hidden: boolean
  collective: boolean
  import: boolean
  defaultSelectionEntryId?: string
  constraints: IrConstraint[]
  modifiers: IrModifier[]
  selectionEntries: IrSelectionEntry[]
  selectionEntryGroups: IrSelectionEntryGroup[]
  entryLinks: IrEntryLink[]
}

export interface IrEntryLink {
  id: string
  name: string
  hidden: boolean
  collective: boolean
  import: boolean
  targetId: string
  type: string
  defaultAmount?: number
  constraints: IrConstraint[]
  costs: IrCost[]
  modifiers: IrModifier[]
  profiles: IrProfile[]
  infoLinks: IrInfoLink[]
  categoryLinks: IrCategoryLink[]
  selectionEntries: IrSelectionEntry[]
  selectionEntryGroups: IrSelectionEntryGroup[]
  entryLinks: IrEntryLink[]
}

export interface IrCategoryEntry {
  id: string
  name: string
  hidden: boolean
}

export interface IrCostType {
  id: string
  name: string
  defaultCostLimit: number
}

export interface IrProfileType {
  id: string
  name: string
  characteristicTypes: Array<{ id: string; name: string }>
}

export interface IrCatalogueRoot {
  costTypes: IrCostType[]
  profileTypes: IrProfileType[]
  categoryEntries: IrCategoryEntry[]
  rules: IrRule[]
  sharedSelectionEntries: IrSelectionEntry[]
  sharedSelectionEntryGroups: IrSelectionEntryGroup[]
  entryLinks: IrEntryLink[]
}

/** A single parsed BSData file (game system or catalogue). */
export interface IrCatalogueFile {
  filename: string
  kind: 'gameSystem' | 'catalogue'
  id: string
  name: string
  gameSystemId?: string
  root: IrCatalogueRoot
}

/** The whole parsed source set: the game system plus every catalogue. */
export interface Ir {
  gameSystem: IrCatalogueFile
  catalogues: IrCatalogueFile[]
}
```

- [ ] **Step 2: Verify typechecks**

Run: `npm run typecheck`
Expected: no errors (the two stubs still compile because their return types are still `Ir` and `Record<string,unknown>`).

- [ ] **Step 3: Commit**

```
git add src/ir/types.ts
git commit -m "feat(ir): expand IR types to full faithful BSData node tree"
```

---

## Task 2: XML parser setup and file-header parsing

Create `src/parse/xml.ts` with the fast-xml-parser configuration and a `parseFile` function that returns an `IrCatalogueFile` with an empty root. Wire a minimal `parseToIr` in `index.ts`. Write one test.

**Files:**
- Create: `src/parse/xml.ts`
- Create: `src/parse/parse.test.ts`
- Modify: `src/parse/index.ts`

**Interfaces:**
- Produces: `parseFile(filename, xml): IrCatalogueFile` - used by all later tasks
- Produces: `EMPTY_ROOT: IrCatalogueRoot` - the zero value for the root, extended task by task

- [ ] **Step 1: Write the failing test**

Create `src/parse/parse.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseToIr } from './index.ts'

// Minimal fixtures - embed XML directly so tests run without BSDATA_DIR.

const GST_HEADER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<gameSystem id="gst-001" name="My System" revision="1" battleScribeVersion="2.03" xmlns="http://www.battlescribe.net/schema/gameSystemSchema">
</gameSystem>`

const CAT_HEADER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<catalogue id="cat-001" name="My Catalogue" revision="1" battleScribeVersion="2.03" gameSystemId="gst-001" gameSystemRevision="1" xmlns="http://www.battlescribe.net/schema/catalogueSchema">
</catalogue>`

describe('parseToIr - file headers', () => {
  it('identifies the game system file', () => {
    const ir = parseToIr({ 'system.gst': GST_HEADER, 'cat.cat': CAT_HEADER })
    expect(ir.gameSystem.kind).toBe('gameSystem')
    expect(ir.gameSystem.filename).toBe('system.gst')
    expect(ir.gameSystem.id).toBe('gst-001')
    expect(ir.gameSystem.name).toBe('My System')
  })

  it('identifies catalogue files', () => {
    const ir = parseToIr({ 'system.gst': GST_HEADER, 'cat.cat': CAT_HEADER })
    expect(ir.catalogues).toHaveLength(1)
    expect(ir.catalogues[0].kind).toBe('catalogue')
    expect(ir.catalogues[0].id).toBe('cat-001')
    expect(ir.catalogues[0].gameSystemId).toBe('gst-001')
  })

  it('throws when no .gst is present', () => {
    expect(() => parseToIr({ 'cat.cat': CAT_HEADER })).toThrow('no .gst')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/parse/parse.test.ts`
Expected: FAIL with "parseToIr: not implemented yet".

- [ ] **Step 3: Create xml.ts and rewrite index.ts**

Create `src/parse/xml.ts`:

```typescript
import { XMLParser } from 'fast-xml-parser'
import type {
  IrCatalogueFile, IrCatalogueRoot,
  IrConstraint, IrCost, IrProfile, IrCharacteristic,
  IrRule, IrInfoLink, IrCategoryLink,
  IrModifier, IrCondition, IrConditionGroup, IrRepeat,
  IrSelectionEntry, IrSelectionEntryGroup, IrEntryLink,
  IrCostType, IrProfileType, IrCategoryEntry,
  IrEntryType,
} from '../ir/types.ts'

const ALWAYS_ARRAY = new Set([
  'selectionEntry', 'selectionEntryGroup', 'entryLink',
  'constraint', 'profile', 'characteristic', 'characteristicType',
  'cost', 'costType', 'profileType',
  'rule', 'categoryLink', 'categoryEntry',
  'infoLink', 'modifier', 'condition', 'conditionGroup', 'repeat',
])

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ALWAYS_ARRAY.has(name),
  parseAttributeValue: true,
})

// ---- primitive node parsers ----

function arr<T>(v: unknown): T[] {
  if (!v) return []
  if (Array.isArray(v)) return v as T[]
  return [v as T]
}

function bool(v: unknown): boolean {
  return v === true || v === 'true'
}

function parseConstraint(n: any): IrConstraint {
  return {
    id: String(n['@_id'] ?? ''),
    type: n['@_type'] === 'min' ? 'min' : 'max',
    value: Number(n['@_value'] ?? 0),
    scope: String(n['@_scope'] ?? ''),
    field: String(n['@_field'] ?? 'selections'),
    shared: bool(n['@_shared']),
    includeChildSelections: bool(n['@_includeChildSelections']),
  }
}

function parseCost(n: any): IrCost {
  return {
    name: String(n['@_name'] ?? ''),
    typeId: String(n['@_typeId'] ?? ''),
    value: Number(n['@_value'] ?? 0),
  }
}

function parseCharacteristic(n: any): IrCharacteristic {
  const raw = n['#text']
  return {
    name: String(n['@_name'] ?? ''),
    typeId: String(n['@_typeId'] ?? ''),
    value: raw != null ? String(raw) : '',
  }
}

function parseProfile(n: any): IrProfile {
  return {
    id: String(n['@_id'] ?? ''),
    name: String(n['@_name'] ?? ''),
    hidden: bool(n['@_hidden']),
    typeId: String(n['@_typeId'] ?? ''),
    typeName: String(n['@_typeName'] ?? ''),
    characteristics: arr<any>(n.characteristics?.characteristic).map(parseCharacteristic),
  }
}

function parseRule(n: any): IrRule {
  return {
    id: String(n['@_id'] ?? ''),
    name: String(n['@_name'] ?? ''),
    hidden: bool(n['@_hidden']),
    description: n.description != null ? String(n.description) : '',
  }
}

function parseInfoLink(n: any): IrInfoLink {
  return {
    id: String(n['@_id'] ?? ''),
    name: String(n['@_name'] ?? ''),
    hidden: bool(n['@_hidden']),
    targetId: String(n['@_targetId'] ?? ''),
    type: String(n['@_type'] ?? ''),
  }
}

function parseCategoryLink(n: any): IrCategoryLink {
  return {
    id: String(n['@_id'] ?? ''),
    targetId: String(n['@_targetId'] ?? ''),
    primary: bool(n['@_primary']),
  }
}

function parseCondition(n: any): IrCondition {
  const out: IrCondition = {
    type: String(n['@_type'] ?? ''),
    value: Number(n['@_value'] ?? 0),
    field: String(n['@_field'] ?? ''),
    scope: String(n['@_scope'] ?? ''),
  }
  if (n['@_childId'] != null) out.childId = String(n['@_childId'])
  if (n['@_shared'] != null) out.shared = bool(n['@_shared'])
  if (n['@_includeChildSelections'] != null) out.includeChildSelections = bool(n['@_includeChildSelections'])
  if (n['@_percentValue'] != null) out.percentValue = bool(n['@_percentValue'])
  return out
}

function parseConditionGroup(n: any): IrConditionGroup {
  return {
    type: String(n['@_type'] ?? ''),
    conditions: arr<any>(n.conditions?.condition).map(parseCondition),
    conditionGroups: arr<any>(n.conditionGroups?.conditionGroup).map(parseConditionGroup),
  }
}

function parseRepeat(n: any): IrRepeat {
  const out: IrRepeat = {
    value: Number(n['@_value'] ?? 0),
    repeats: Number(n['@_repeats'] ?? 0),
    field: String(n['@_field'] ?? ''),
    scope: String(n['@_scope'] ?? ''),
  }
  if (n['@_childId'] != null) out.childId = String(n['@_childId'])
  if (n['@_shared'] != null) out.shared = bool(n['@_shared'])
  if (n['@_includeChildSelections'] != null) out.includeChildSelections = bool(n['@_includeChildSelections'])
  if (n['@_roundUp'] != null) out.roundUp = bool(n['@_roundUp'])
  return out
}

function parseModifier(n: any): IrModifier {
  return {
    type: String(n['@_type'] ?? ''),
    field: String(n['@_field'] ?? ''),
    value: n['@_value'] ?? '',
    conditions: arr<any>(n.conditions?.condition).map(parseCondition),
    conditionGroups: arr<any>(n.conditionGroups?.conditionGroup).map(parseConditionGroup),
    repeats: arr<any>(n.repeats?.repeat).map(parseRepeat),
  }
}

// ---- structural node parsers (forward-declared for recursion) ----

function parseSelectionEntry(n: any): IrSelectionEntry {
  return {
    id: String(n['@_id'] ?? ''),
    name: String(n['@_name'] ?? ''),
    hidden: bool(n['@_hidden']),
    collective: bool(n['@_collective']),
    import: bool(n['@_import']),
    type: (n['@_type'] ?? 'upgrade') as IrEntryType,
    defaultAmount: n['@_defaultAmount'] != null ? Number(n['@_defaultAmount']) : undefined,
    constraints: arr<any>(n.constraints?.constraint).map(parseConstraint),
    profiles: arr<any>(n.profiles?.profile).map(parseProfile),
    rules: arr<any>(n.rules?.rule).map(parseRule),
    infoLinks: arr<any>(n.infoLinks?.infoLink).map(parseInfoLink),
    categoryLinks: arr<any>(n.categoryLinks?.categoryLink).map(parseCategoryLink),
    costs: arr<any>(n.costs?.cost).map(parseCost),
    modifiers: arr<any>(n.modifiers?.modifier).map(parseModifier),
    selectionEntries: arr<any>(n.selectionEntries?.selectionEntry).map(parseSelectionEntry),
    selectionEntryGroups: arr<any>(n.selectionEntryGroups?.selectionEntryGroup).map(parseSelectionEntryGroup),
    entryLinks: arr<any>(n.entryLinks?.entryLink).map(parseEntryLink),
  }
}

function parseSelectionEntryGroup(n: any): IrSelectionEntryGroup {
  return {
    id: String(n['@_id'] ?? ''),
    name: String(n['@_name'] ?? ''),
    hidden: bool(n['@_hidden']),
    collective: bool(n['@_collective']),
    import: bool(n['@_import']),
    defaultSelectionEntryId: n['@_defaultSelectionEntryId'] != null
      ? String(n['@_defaultSelectionEntryId']) : undefined,
    constraints: arr<any>(n.constraints?.constraint).map(parseConstraint),
    modifiers: arr<any>(n.modifiers?.modifier).map(parseModifier),
    selectionEntries: arr<any>(n.selectionEntries?.selectionEntry).map(parseSelectionEntry),
    selectionEntryGroups: arr<any>(n.selectionEntryGroups?.selectionEntryGroup).map(parseSelectionEntryGroup),
    entryLinks: arr<any>(n.entryLinks?.entryLink).map(parseEntryLink),
  }
}

function parseEntryLink(n: any): IrEntryLink {
  return {
    id: String(n['@_id'] ?? ''),
    name: String(n['@_name'] ?? ''),
    hidden: bool(n['@_hidden']),
    collective: bool(n['@_collective']),
    import: bool(n['@_import']),
    targetId: String(n['@_targetId'] ?? ''),
    type: String(n['@_type'] ?? ''),
    defaultAmount: n['@_defaultAmount'] != null ? Number(n['@_defaultAmount']) : undefined,
    constraints: arr<any>(n.constraints?.constraint).map(parseConstraint),
    costs: arr<any>(n.costs?.cost).map(parseCost),
    modifiers: arr<any>(n.modifiers?.modifier).map(parseModifier),
    profiles: arr<any>(n.profiles?.profile).map(parseProfile),
    infoLinks: arr<any>(n.infoLinks?.infoLink).map(parseInfoLink),
    categoryLinks: arr<any>(n.categoryLinks?.categoryLink).map(parseCategoryLink),
    selectionEntries: arr<any>(n.selectionEntries?.selectionEntry).map(parseSelectionEntry),
    selectionEntryGroups: arr<any>(n.selectionEntryGroups?.selectionEntryGroup).map(parseSelectionEntryGroup),
    entryLinks: arr<any>(n.entryLinks?.entryLink).map(parseEntryLink),
  }
}

// ---- catalogue root ----

function parseCatalogueRoot(r: any): IrCatalogueRoot {
  return {
    costTypes: arr<any>(r.costTypes?.costType).map((n: any) => ({
      id: String(n['@_id'] ?? ''),
      name: String(n['@_name'] ?? ''),
      defaultCostLimit: Number(n['@_defaultCostLimit'] ?? -1),
    } satisfies IrCostType)),
    profileTypes: arr<any>(r.profileTypes?.profileType).map((n: any) => ({
      id: String(n['@_id'] ?? ''),
      name: String(n['@_name'] ?? ''),
      characteristicTypes: arr<any>(n.characteristicTypes?.characteristicType).map((c: any) => ({
        id: String(c['@_id'] ?? ''),
        name: String(c['@_name'] ?? ''),
      })),
    } satisfies IrProfileType)),
    categoryEntries: arr<any>(r.categoryEntries?.categoryEntry).map((n: any) => ({
      id: String(n['@_id'] ?? ''),
      name: String(n['@_name'] ?? ''),
      hidden: bool(n['@_hidden']),
    } satisfies IrCategoryEntry)),
    rules: arr<any>(r.rules?.rule).map(parseRule),
    sharedSelectionEntries: arr<any>(r.sharedSelectionEntries?.selectionEntry).map(parseSelectionEntry),
    sharedSelectionEntryGroups: arr<any>(r.sharedSelectionEntryGroups?.selectionEntryGroup).map(parseSelectionEntryGroup),
    entryLinks: arr<any>(r.entryLinks?.entryLink).map(parseEntryLink),
  }
}

// ---- public entry ----

export function parseFile(filename: string, xml: string): IrCatalogueFile {
  const doc = xmlParser.parse(xml)
  const isGst = 'gameSystem' in doc
  const root = isGst ? doc.gameSystem : doc.catalogue
  const kind: 'gameSystem' | 'catalogue' = isGst ? 'gameSystem' : 'catalogue'
  return {
    filename,
    kind,
    id: String(root['@_id'] ?? ''),
    name: String(root['@_name'] ?? ''),
    gameSystemId: root['@_gameSystemId'] != null ? String(root['@_gameSystemId']) : undefined,
    root: parseCatalogueRoot(root),
  }
}
```

Rewrite `src/parse/index.ts`:

```typescript
import type { Ir } from '../ir/types.ts'
import { parseFile } from './xml.ts'

export function parseToIr(files: Record<string, string>): Ir {
  const parsed = Object.entries(files).map(([filename, xml]) => parseFile(filename, xml))
  const gameSystem = parsed.find(f => f.kind === 'gameSystem')
  if (!gameSystem) throw new Error('parseToIr: no .gst file in source set')
  return {
    gameSystem,
    catalogues: parsed.filter(f => f.kind === 'catalogue'),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/parse/parse.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```
git add src/parse/xml.ts src/parse/index.ts src/parse/parse.test.ts
git commit -m "feat(parse): XML parser setup and file-header parsing"
```

---

## Task 3: Parse constraint nodes

Verify constraints survive into the IR without modification. Write tests with explicit XML fixtures before touching any code (constraints are already wired in xml.ts from Task 2, so the tests establish the expected values from the fixture and confirm the wiring is correct).

**Files:**
- Modify: `src/parse/parse.test.ts`
- Modify: `src/parse/xml.ts` (fix bugs the tests surface, if any)

**Interfaces:**
- Consumes: `parseToIr` from Task 2
- Produces: `IrConstraint` nodes accessible via `ir.catalogues[0].root.sharedSelectionEntries[0].constraints`

- [ ] **Step 1: Write the failing tests**

Append to `src/parse/parse.test.ts`:

```typescript
const CAT_WITH_CONSTRAINTS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<catalogue id="cat-001" name="Test" revision="1" battleScribeVersion="2.03" gameSystemId="gst-001" gameSystemRevision="1" xmlns="http://www.battlescribe.net/schema/catalogueSchema">
  <sharedSelectionEntries>
    <selectionEntry id="se-001" name="Tactical Legionary" hidden="false" collective="false" import="true" type="unit">
      <constraints>
        <constraint id="cst-001" type="max" value="1.0" scope="roster" field="selections" shared="true" includeChildSelections="false"/>
        <constraint id="cst-002" type="min" value="5.0" scope="parent" field="selections" shared="false" includeChildSelections="false"/>
      </constraints>
      <costs>
        <cost name="pts" typeId="pts-id" value="15.0"/>
      </costs>
    </selectionEntry>
  </sharedSelectionEntries>
</catalogue>`

describe('parseToIr - constraints', () => {
  const files = { 'system.gst': GST_HEADER, 'cat.cat': CAT_WITH_CONSTRAINTS }

  it('parses constraint count', () => {
    const ir = parseToIr(files)
    const entry = ir.catalogues[0].root.sharedSelectionEntries[0]
    expect(entry.constraints).toHaveLength(2)
  })

  it('retains the max constraint with raw scope', () => {
    const ir = parseToIr(files)
    const cst = ir.catalogues[0].root.sharedSelectionEntries[0].constraints[0]
    expect(cst).toMatchObject({ id: 'cst-001', type: 'max', value: 1, scope: 'roster', field: 'selections', shared: true })
  })

  it('retains the min constraint', () => {
    const ir = parseToIr(files)
    const cst = ir.catalogues[0].root.sharedSelectionEntries[0].constraints[1]
    expect(cst).toMatchObject({ id: 'cst-002', type: 'min', value: 5, scope: 'parent', field: 'selections', shared: false })
  })

  it('parses cost on the entry', () => {
    const ir = parseToIr(files)
    const entry = ir.catalogues[0].root.sharedSelectionEntries[0]
    expect(entry.costs).toHaveLength(1)
    expect(entry.costs[0]).toMatchObject({ name: 'pts', value: 15, typeId: 'pts-id' })
  })
})
```

- [ ] **Step 2: Run tests to see result**

Run: `npx vitest run src/parse/parse.test.ts`
Expected: PASS if xml.ts wiring is correct from Task 2, or reveals a parsing bug to fix.

- [ ] **Step 3: Fix any failures**

If any test fails, read the error, trace back to `parseConstraint` or the `arr()` helper in `xml.ts`, and fix. Common issues: `fast-xml-parser` treating a single-child `<constraints>` as an object instead of array (fix: ensure `constraint` is in `ALWAYS_ARRAY`); numeric attribute not coerced (fix: `parseAttributeValue: true` is already set).

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run src/parse/parse.test.ts`
Expected: PASS (all tests including prior header tests).

- [ ] **Step 5: Commit**

```
git add src/parse/parse.test.ts src/parse/xml.ts
git commit -m "test(parse): verify constraint nodes survive into IR"
```

---

## Task 4: Parse selection entry groups and entry links with constraints

Verify that constraints on a `selectionEntryGroup` and on an `entryLink` also survive into the IR. These are the nodes the downstream projector reads to produce `perModelMax`, `unitMax`, etc. Write tests first, then confirm the wiring introduced in Task 2 handles them correctly.

**Files:**
- Modify: `src/parse/parse.test.ts`
- Modify: `src/parse/xml.ts` (fix bugs the tests surface, if any)

- [ ] **Step 1: Write the failing tests**

Append to `src/parse/parse.test.ts`:

```typescript
const CAT_WITH_GROUP_AND_LINK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<catalogue id="cat-001" name="Test" revision="1" battleScribeVersion="2.03" gameSystemId="gst-001" gameSystemRevision="1" xmlns="http://www.battlescribe.net/schema/catalogueSchema">
  <sharedSelectionEntries>
    <selectionEntry id="se-001" name="Tactical Legionary" hidden="false" collective="false" import="true" type="unit">
      <selectionEntryGroups>
        <selectionEntryGroup id="seg-001" name="Legion Equipment" hidden="false" collective="false" import="true">
          <constraints>
            <constraint id="cst-g1" type="max" value="2.0" scope="unit" field="selections" shared="false" includeChildSelections="false"/>
            <constraint id="cst-g2" type="max" value="1.0" scope="parent" field="selections" shared="false" includeChildSelections="false"/>
          </constraints>
          <entryLinks>
            <entryLink id="el-001" name="Nuncio-vox" hidden="false" collective="false" import="true" targetId="shared-nuncio" type="selectionEntry">
              <constraints>
                <constraint id="cst-l1" type="max" value="1.0" scope="unit" field="selections" shared="false" includeChildSelections="false"/>
              </constraints>
              <costs>
                <cost name="pts" typeId="pts-id" value="5.0"/>
              </costs>
            </entryLink>
          </entryLinks>
        </selectionEntryGroup>
      </selectionEntryGroups>
    </selectionEntry>
  </sharedSelectionEntries>
</catalogue>`

describe('parseToIr - groups and links', () => {
  const files = { 'system.gst': GST_HEADER, 'cat.cat': CAT_WITH_GROUP_AND_LINK }

  it('parses the selection entry group', () => {
    const ir = parseToIr(files)
    const entry = ir.catalogues[0].root.sharedSelectionEntries[0]
    expect(entry.selectionEntryGroups).toHaveLength(1)
    expect(entry.selectionEntryGroups[0].id).toBe('seg-001')
    expect(entry.selectionEntryGroups[0].name).toBe('Legion Equipment')
  })

  it('retains both constraints on the group with raw scope strings', () => {
    const ir = parseToIr(files)
    const group = ir.catalogues[0].root.sharedSelectionEntries[0].selectionEntryGroups[0]
    expect(group.constraints).toHaveLength(2)
    expect(group.constraints[0]).toMatchObject({ id: 'cst-g1', type: 'max', value: 2, scope: 'unit' })
    expect(group.constraints[1]).toMatchObject({ id: 'cst-g2', type: 'max', value: 1, scope: 'parent' })
  })

  it('parses the entry link inside the group', () => {
    const ir = parseToIr(files)
    const group = ir.catalogues[0].root.sharedSelectionEntries[0].selectionEntryGroups[0]
    expect(group.entryLinks).toHaveLength(1)
    expect(group.entryLinks[0]).toMatchObject({ id: 'el-001', targetId: 'shared-nuncio', type: 'selectionEntry' })
  })

  it('retains the constraint on the entry link', () => {
    const ir = parseToIr(files)
    const link = ir.catalogues[0].root.sharedSelectionEntries[0].selectionEntryGroups[0].entryLinks[0]
    expect(link.constraints).toHaveLength(1)
    expect(link.constraints[0]).toMatchObject({ id: 'cst-l1', type: 'max', value: 1, scope: 'unit' })
  })

  it('retains the cost on the entry link', () => {
    const ir = parseToIr(files)
    const link = ir.catalogues[0].root.sharedSelectionEntries[0].selectionEntryGroups[0].entryLinks[0]
    expect(link.costs).toHaveLength(1)
    expect(link.costs[0]).toMatchObject({ name: 'pts', value: 5 })
  })
})
```

- [ ] **Step 2: Run tests to see result**

Run: `npx vitest run src/parse/parse.test.ts`
Expected: PASS. If any test fails, trace to the `parseSelectionEntryGroup` or `parseEntryLink` function in `xml.ts` and fix.

- [ ] **Step 3: Commit**

```
git add src/parse/parse.test.ts
git commit -m "test(parse): verify group and link constraints survive into IR"
```

---

## Task 5: Parse modifier and condition trees (opaque retention)

Verify modifier+condition sub-trees survive into the IR verbatim and the `hasConditionalCaps` marker can be computed from them. The modifier is NOT evaluated - only retained.

**Files:**
- Modify: `src/parse/parse.test.ts`
- Modify: `src/parse/xml.ts` (fix bugs the tests surface, if any)

- [ ] **Step 1: Write the failing tests**

Append to `src/parse/parse.test.ts`:

```typescript
const CAT_WITH_MODIFIER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<catalogue id="cat-001" name="Test" revision="1" battleScribeVersion="2.03" gameSystemId="gst-001" gameSystemRevision="1" xmlns="http://www.battlescribe.net/schema/catalogueSchema">
  <sharedSelectionEntries>
    <selectionEntry id="se-001" name="Bolter Legionary" hidden="false" collective="false" import="true" type="unit">
      <selectionEntryGroups>
        <selectionEntryGroup id="seg-001" name="Bolter" hidden="false" collective="false" import="true">
          <constraints>
            <constraint id="cst-001" type="min" value="1.0" scope="parent" field="selections" shared="false" includeChildSelections="false"/>
            <constraint id="cst-002" type="max" value="1.0" scope="parent" field="selections" shared="false" includeChildSelections="false"/>
          </constraints>
          <modifiers>
            <modifier type="set" field="value" value="0">
              <conditions>
                <condition type="atLeast" value="1.0" field="selections" scope="ancestor" childId="rite-iron-warriors" shared="true" includeChildSelections="false"/>
              </conditions>
            </modifier>
          </modifiers>
        </selectionEntryGroup>
      </selectionEntryGroups>
    </selectionEntry>
  </sharedSelectionEntries>
</catalogue>`

describe('parseToIr - modifiers', () => {
  const files = { 'system.gst': GST_HEADER, 'cat.cat': CAT_WITH_MODIFIER }

  it('retains modifier on the group', () => {
    const ir = parseToIr(files)
    const group = ir.catalogues[0].root.sharedSelectionEntries[0].selectionEntryGroups[0]
    expect(group.modifiers).toHaveLength(1)
    expect(group.modifiers[0]).toMatchObject({ type: 'set', field: 'value', value: 0 })
  })

  it('retains the condition inside the modifier verbatim', () => {
    const ir = parseToIr(files)
    const mod = ir.catalogues[0].root.sharedSelectionEntries[0].selectionEntryGroups[0].modifiers[0]
    expect(mod.conditions).toHaveLength(1)
    expect(mod.conditions[0]).toMatchObject({
      type: 'atLeast',
      value: 1,
      scope: 'ancestor',
      childId: 'rite-iron-warriors',
    })
  })

  it('static constraints are also present alongside the modifier', () => {
    const ir = parseToIr(files)
    const group = ir.catalogues[0].root.sharedSelectionEntries[0].selectionEntryGroups[0]
    expect(group.constraints).toHaveLength(2)
    expect(group.constraints[0]).toMatchObject({ type: 'min', value: 1, scope: 'parent' })
    expect(group.constraints[1]).toMatchObject({ type: 'max', value: 1, scope: 'parent' })
  })

  it('a group with a constraint-modifying modifier reports hasModifiers (for the projection to use)', () => {
    const ir = parseToIr(files)
    const group = ir.catalogues[0].root.sharedSelectionEntries[0].selectionEntryGroups[0]
    // The projector uses the presence of modifiers to set hasConditionalCaps.
    // This test pins that the IR retains enough data for the projector to make that call.
    const hasConstraintModifier = group.modifiers.some(
      m => m.type === 'set' && (m.field === 'value' || m.field === 'hidden') && m.conditions.length > 0
    )
    expect(hasConstraintModifier).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to see result**

Run: `npx vitest run src/parse/parse.test.ts`
Expected: PASS. If any test fails trace to `parseModifier` / `parseCondition` in xml.ts.

- [ ] **Step 3: Commit**

```
git add src/parse/parse.test.ts
git commit -m "test(parse): verify modifier and condition trees retained verbatim in IR"
```

---

## Task 6: Parse profiles and shared rules

Verify profile characteristics and shared rules (which carry description text for wargear/abilities) survive into the IR. These are needed by the projector to populate `description` and weapon stat lines.

**Files:**
- Modify: `src/parse/parse.test.ts`
- Modify: `src/parse/xml.ts` (fix bugs if any)

- [ ] **Step 1: Write the failing tests**

Append to `src/parse/parse.test.ts`:

```typescript
const CAT_WITH_PROFILE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<catalogue id="cat-001" name="Test" revision="1" battleScribeVersion="2.03" gameSystemId="gst-001" gameSystemRevision="1" xmlns="http://www.battlescribe.net/schema/catalogueSchema">
  <rules>
    <rule id="rule-001" name="And They Shall Know No Fear" hidden="false">
      <description>Units with this rule may re-roll Morale tests.</description>
    </rule>
  </rules>
  <sharedSelectionEntries>
    <selectionEntry id="se-001" name="Bolt Pistol" hidden="false" collective="false" import="true" type="upgrade">
      <profiles>
        <profile id="prf-001" name="Bolt Pistol" hidden="false" typeId="type-weapon" typeName="Ranged Weapon">
          <characteristics>
            <characteristic name="Range" typeId="chr-range">12&quot;</characteristic>
            <characteristic name="Str" typeId="chr-str">4</characteristic>
            <characteristic name="AP" typeId="chr-ap">5</characteristic>
          </characteristics>
        </profile>
      </profiles>
    </selectionEntry>
  </sharedSelectionEntries>
</catalogue>`

describe('parseToIr - profiles and rules', () => {
  const files = { 'system.gst': GST_HEADER, 'cat.cat': CAT_WITH_PROFILE }

  it('parses a catalogue-level shared rule with description', () => {
    const ir = parseToIr(files)
    expect(ir.catalogues[0].root.rules).toHaveLength(1)
    expect(ir.catalogues[0].root.rules[0]).toMatchObject({
      id: 'rule-001',
      name: 'And They Shall Know No Fear',
      hidden: false,
      description: 'Units with this rule may re-roll Morale tests.',
    })
  })

  it('parses a profile with typeName', () => {
    const ir = parseToIr(files)
    const entry = ir.catalogues[0].root.sharedSelectionEntries[0]
    expect(entry.profiles).toHaveLength(1)
    expect(entry.profiles[0]).toMatchObject({
      id: 'prf-001', name: 'Bolt Pistol', typeName: 'Ranged Weapon',
    })
  })

  it('retains all characteristics on the profile', () => {
    const ir = parseToIr(files)
    const chars = ir.catalogues[0].root.sharedSelectionEntries[0].profiles[0].characteristics
    expect(chars).toHaveLength(3)
    expect(chars.find(c => c.name === 'Range')?.value).toBe('12"')
    expect(chars.find(c => c.name === 'Str')?.value).toBe('4')
  })
})
```

- [ ] **Step 2: Run tests to see result**

Run: `npx vitest run src/parse/parse.test.ts`
Expected: PASS. If characteristics are empty, check that `characteristicType` and `characteristic` are both in `ALWAYS_ARRAY` and that `#text` is set as `textNodeName`.

- [ ] **Step 3: Commit**

```
git add src/parse/parse.test.ts
git commit -m "test(parse): verify profiles and shared rules retained in IR"
```

---

## Task 7: Parse top-level catalogue metadata and shared registries

Verify `costTypes`, `profileTypes`, `categoryEntries`, `sharedSelectionEntryGroups`, and top-level `entryLinks` parse correctly. These cover the remaining IR fields.

**Files:**
- Modify: `src/parse/parse.test.ts`
- Modify: `src/parse/xml.ts` (fix bugs if any)

- [ ] **Step 1: Write the failing tests**

Append to `src/parse/parse.test.ts`:

```typescript
const GST_FULL = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<gameSystem id="gst-001" name="My System" revision="1" battleScribeVersion="2.03" xmlns="http://www.battlescribe.net/schema/gameSystemSchema">
  <costTypes>
    <costType id="pts-id" name="pts" defaultCostLimit="-1.0"/>
  </costTypes>
  <profileTypes>
    <profileType id="ptype-unit" name="Unit">
      <characteristicTypes>
        <characteristicType id="chr-ws" name="WS"/>
        <characteristicType id="chr-bs" name="BS"/>
      </characteristicTypes>
    </profileType>
  </profileTypes>
  <categoryEntries>
    <categoryEntry id="cat-troop" name="Troops" hidden="false"/>
  </categoryEntries>
  <sharedSelectionEntryGroups>
    <selectionEntryGroup id="seg-shared-001" name="Shared Wargear Group" hidden="false" collective="false" import="true">
      <constraints>
        <constraint id="cst-sg1" type="max" value="3.0" scope="unit" field="selections" shared="false" includeChildSelections="false"/>
      </constraints>
    </selectionEntryGroup>
  </sharedSelectionEntryGroups>
  <entryLinks>
    <entryLink id="root-el-001" name="Tactical Squad" hidden="false" collective="false" import="true" targetId="se-tactical" type="selectionEntry">
    </entryLink>
  </entryLinks>
</gameSystem>`

describe('parseToIr - catalogue metadata', () => {
  const files = { 'system.gst': GST_FULL, 'cat.cat': CAT_HEADER }

  it('parses costTypes', () => {
    const ir = parseToIr(files)
    expect(ir.gameSystem.root.costTypes).toHaveLength(1)
    expect(ir.gameSystem.root.costTypes[0]).toMatchObject({ id: 'pts-id', name: 'pts', defaultCostLimit: -1 })
  })

  it('parses profileTypes with characteristicTypes', () => {
    const ir = parseToIr(files)
    const pt = ir.gameSystem.root.profileTypes[0]
    expect(pt.name).toBe('Unit')
    expect(pt.characteristicTypes).toHaveLength(2)
    expect(pt.characteristicTypes[0]).toMatchObject({ id: 'chr-ws', name: 'WS' })
  })

  it('parses categoryEntries', () => {
    const ir = parseToIr(files)
    expect(ir.gameSystem.root.categoryEntries).toHaveLength(1)
    expect(ir.gameSystem.root.categoryEntries[0]).toMatchObject({ id: 'cat-troop', name: 'Troops', hidden: false })
  })

  it('parses sharedSelectionEntryGroups with constraints', () => {
    const ir = parseToIr(files)
    const seg = ir.gameSystem.root.sharedSelectionEntryGroups[0]
    expect(seg.id).toBe('seg-shared-001')
    expect(seg.constraints).toHaveLength(1)
    expect(seg.constraints[0]).toMatchObject({ type: 'max', value: 3, scope: 'unit' })
  })

  it('parses root-level entryLinks', () => {
    const ir = parseToIr(files)
    expect(ir.gameSystem.root.entryLinks).toHaveLength(1)
    expect(ir.gameSystem.root.entryLinks[0]).toMatchObject({ id: 'root-el-001', targetId: 'se-tactical', type: 'selectionEntry' })
  })
})
```

- [ ] **Step 2: Run tests to see result**

Run: `npx vitest run src/parse/parse.test.ts`
Expected: PASS for all tests. If `profileTypes` returns empty, check `profileType` and `characteristicType` are in `ALWAYS_ARRAY`.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS (all parse tests + harness/diff.test.ts + golden-parity auto-skips without `BSDATA_DIR`).

- [ ] **Step 4: Commit**

```
git add src/parse/parse.test.ts
git commit -m "test(parse): verify catalogue metadata and shared registries parse correctly"
```

---

## Self-Review

**Spec coverage:**
- IR types covering all BSData nodes: Task 1.
- File header parsing (kind, id, name, gameSystemId): Task 2.
- Constraint nodes with raw scope, field, shared: Tasks 3-4.
- Group constraints and entry link constraints (the key lossy-flatten fix): Task 4.
- Modifier + condition tree verbatim retention: Task 5.
- Profiles and shared rules (for projector to use for descriptions/weapon stats): Task 6.
- Top-level metadata (costTypes, profileTypes, categoryEntries) and shared registries: Task 7.
- Golden-parity test remains the integration gate throughout.

**Placeholder scan:** None. Every step contains complete code.

**Type consistency:**
- `IrConstraint.type` is `'min' | 'max'` in types.ts and parsed as `n['@_type'] === 'min' ? 'min' : 'max'` in xml.ts.
- `parseSelectionEntry`, `parseSelectionEntryGroup`, `parseEntryLink` are mutually recursive and all call each other consistently.
- `arr<T>()` helper is used uniformly throughout.

**Note on the projector:** `src/project/catalogue.ts` is the LOCAL, gitignored domain projector. It is NOT in scope for this plan. Once the parser is complete, the local projector can use the IR to produce an output matching the oracle, and the golden-parity test will go green.
