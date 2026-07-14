import { describe, it, expect } from 'vitest'
import { parseToIr } from './index.ts'

// Minimal fixtures - embed JSON directly so tests run without BSDATA_DIR.
// Field/container conventions verified against a real BSData JSON export (2026-07-14 migration):
// plain attribute keys (no @_ prefix), "$text" for element text content, and flat arrays under
// the plural key directly (no singular-tag wrapper the way parsed XML has it).

const GST_HEADER_JSON = JSON.stringify({
  gameSystem: { id: 'gst-001', name: 'My System', revision: '1', battleScribeVersion: '2.03' },
})

const CAT_HEADER_JSON = JSON.stringify({
  catalogue: {
    id: 'cat-001', name: 'My Catalogue', revision: '1', battleScribeVersion: '2.03',
    gameSystemId: 'gst-001', gameSystemRevision: '1',
  },
})

describe('parseToIr (JSON source) - file headers', () => {
  it('identifies the game system file', () => {
    const ir = parseToIr({ 'system.json': GST_HEADER_JSON, 'cat.json': CAT_HEADER_JSON })
    expect(ir.gameSystem.kind).toBe('gameSystem')
    expect(ir.gameSystem.filename).toBe('system.json')
    expect(ir.gameSystem.id).toBe('gst-001')
    expect(ir.gameSystem.name).toBe('My System')
  })

  it('identifies catalogue files', () => {
    const ir = parseToIr({ 'system.json': GST_HEADER_JSON, 'cat.json': CAT_HEADER_JSON })
    expect(ir.catalogues).toHaveLength(1)
    expect(ir.catalogues[0]!.kind).toBe('catalogue')
    expect(ir.catalogues[0]!.id).toBe('cat-001')
    expect(ir.catalogues[0]!.gameSystemId).toBe('gst-001')
  })

  it('parses a mixed XML + JSON source set together', () => {
    const XML_CAT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<catalogue id="cat-xml" name="XML Catalogue" revision="1" battleScribeVersion="2.03" gameSystemId="gst-001" gameSystemRevision="1" xmlns="http://www.battlescribe.net/schema/catalogueSchema">
</catalogue>`
    const ir = parseToIr({ 'system.json': GST_HEADER_JSON, 'cat-json.json': CAT_HEADER_JSON, 'cat-xml.cat': XML_CAT })
    expect(ir.catalogues).toHaveLength(2)
    const byId = Object.fromEntries(ir.catalogues.map(c => [c.id, c]))
    expect(byId['cat-001']!.name).toBe('My Catalogue')
    expect(byId['cat-xml']!.name).toBe('XML Catalogue')
  })
})

// ---- Task 3: constraints ----

const CAT_WITH_CONSTRAINTS_JSON = JSON.stringify({
  catalogue: {
    id: 'cat-001', name: 'Test', revision: '1', battleScribeVersion: '2.03',
    gameSystemId: 'gst-001', gameSystemRevision: '1',
    sharedSelectionEntries: [
      {
        id: 'se-001', name: 'Tactical Legionary', hidden: false, collective: false, import: true, type: 'unit',
        constraints: [
          { id: 'cst-001', type: 'max', value: 1, scope: 'roster', field: 'selections', shared: true, includeChildSelections: false },
          { id: 'cst-002', type: 'min', value: 5, scope: 'parent', field: 'selections', shared: false, includeChildSelections: false },
        ],
        costs: [
          { name: 'pts', typeId: 'pts-id', value: 15 },
        ],
      },
    ],
  },
})

describe('parseToIr (JSON source) - constraints', () => {
  const files = { 'system.json': GST_HEADER_JSON, 'cat.json': CAT_WITH_CONSTRAINTS_JSON }

  it('parses constraint count', () => {
    const ir = parseToIr(files)
    const entry = ir.catalogues[0]!.root.sharedSelectionEntries[0]!
    expect(entry.constraints).toHaveLength(2)
  })

  it('retains the max constraint with raw scope', () => {
    const ir = parseToIr(files)
    const cst = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.constraints[0]
    expect(cst).toMatchObject({ id: 'cst-001', type: 'max', value: 1, scope: 'roster', field: 'selections', shared: true })
  })

  it('retains the min constraint', () => {
    const ir = parseToIr(files)
    const cst = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.constraints[1]
    expect(cst).toMatchObject({ id: 'cst-002', type: 'min', value: 5, scope: 'parent', field: 'selections', shared: false })
  })

  it('parses cost on the entry', () => {
    const ir = parseToIr(files)
    const entry = ir.catalogues[0]!.root.sharedSelectionEntries[0]!
    expect(entry.costs).toHaveLength(1)
    expect(entry.costs[0]).toMatchObject({ name: 'pts', value: 15, typeId: 'pts-id' })
  })
})

// ---- Task 4: groups and links ----

const CAT_WITH_GROUP_AND_LINK_JSON = JSON.stringify({
  catalogue: {
    id: 'cat-001', name: 'Test', revision: '1', battleScribeVersion: '2.03',
    gameSystemId: 'gst-001', gameSystemRevision: '1',
    sharedSelectionEntries: [
      {
        id: 'se-001', name: 'Tactical Legionary', hidden: false, collective: false, import: true, type: 'unit',
        selectionEntryGroups: [
          {
            id: 'seg-001', name: 'Legion Equipment', hidden: false, collective: false, import: true,
            constraints: [
              { id: 'cst-g1', type: 'max', value: 2, scope: 'unit', field: 'selections', shared: false, includeChildSelections: false },
              { id: 'cst-g2', type: 'max', value: 1, scope: 'parent', field: 'selections', shared: false, includeChildSelections: false },
            ],
            entryLinks: [
              {
                id: 'el-001', name: 'Nuncio-vox', hidden: false, collective: false, import: true, targetId: 'shared-nuncio', type: 'selectionEntry',
                constraints: [
                  { id: 'cst-l1', type: 'max', value: 1, scope: 'unit', field: 'selections', shared: false, includeChildSelections: false },
                ],
                costs: [
                  { name: 'pts', typeId: 'pts-id', value: 5 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
})

describe('parseToIr (JSON source) - groups and links', () => {
  const files = { 'system.json': GST_HEADER_JSON, 'cat.json': CAT_WITH_GROUP_AND_LINK_JSON }

  it('parses the selection entry group', () => {
    const ir = parseToIr(files)
    const entry = ir.catalogues[0]!.root.sharedSelectionEntries[0]!
    expect(entry.selectionEntryGroups).toHaveLength(1)
    expect(entry.selectionEntryGroups[0]!.id).toBe('seg-001')
    expect(entry.selectionEntryGroups[0]!.name).toBe('Legion Equipment')
  })

  it('retains both constraints on the group with raw scope strings', () => {
    const ir = parseToIr(files)
    const group = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!
    expect(group.constraints).toHaveLength(2)
    expect(group.constraints[0]).toMatchObject({ id: 'cst-g1', type: 'max', value: 2, scope: 'unit' })
    expect(group.constraints[1]).toMatchObject({ id: 'cst-g2', type: 'max', value: 1, scope: 'parent' })
  })

  it('parses the entry link inside the group', () => {
    const ir = parseToIr(files)
    const group = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!
    expect(group.entryLinks).toHaveLength(1)
    expect(group.entryLinks[0]).toMatchObject({ id: 'el-001', targetId: 'shared-nuncio', type: 'selectionEntry' })
  })

  it('retains the constraint on the entry link', () => {
    const ir = parseToIr(files)
    const link = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!.entryLinks[0]!
    expect(link.constraints).toHaveLength(1)
    expect(link.constraints[0]).toMatchObject({ id: 'cst-l1', type: 'max', value: 1, scope: 'unit' })
  })

  it('retains the cost on the entry link', () => {
    const ir = parseToIr(files)
    const link = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!.entryLinks[0]!
    expect(link.costs).toHaveLength(1)
    expect(link.costs[0]).toMatchObject({ name: 'pts', value: 5 })
  })
})

// ---- Task 5: modifiers ----

const CAT_WITH_MODIFIER_JSON = JSON.stringify({
  catalogue: {
    id: 'cat-001', name: 'Test', revision: '1', battleScribeVersion: '2.03',
    gameSystemId: 'gst-001', gameSystemRevision: '1',
    sharedSelectionEntries: [
      {
        id: 'se-001', name: 'Bolter Legionary', hidden: false, collective: false, import: true, type: 'unit',
        selectionEntryGroups: [
          {
            id: 'seg-001', name: 'Bolter', hidden: false, collective: false, import: true,
            constraints: [
              { id: 'cst-001', type: 'min', value: 1, scope: 'parent', field: 'selections', shared: false, includeChildSelections: false },
              { id: 'cst-002', type: 'max', value: 1, scope: 'parent', field: 'selections', shared: false, includeChildSelections: false },
            ],
            modifiers: [
              {
                type: 'set', field: 'value', value: 0,
                conditions: [
                  { type: 'atLeast', value: 1, field: 'selections', scope: 'ancestor', childId: 'rite-iron-warriors', shared: true, includeChildSelections: false },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
})

describe('parseToIr (JSON source) - modifiers', () => {
  const files = { 'system.json': GST_HEADER_JSON, 'cat.json': CAT_WITH_MODIFIER_JSON }

  it('retains modifier on the group', () => {
    const ir = parseToIr(files)
    const group = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!
    expect(group.modifiers).toHaveLength(1)
    expect(group.modifiers[0]).toMatchObject({ type: 'set', field: 'value', value: 0 })
  })

  it('retains the condition inside the modifier verbatim', () => {
    const ir = parseToIr(files)
    const mod = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!.modifiers[0]!
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
    const group = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!
    expect(group.constraints).toHaveLength(2)
    expect(group.constraints[0]).toMatchObject({ type: 'min', value: 1, scope: 'parent' })
    expect(group.constraints[1]).toMatchObject({ type: 'max', value: 1, scope: 'parent' })
  })

  it('a group with a constraint-modifying modifier retains enough data for the projector to set hasConditionalCaps', () => {
    const ir = parseToIr(files)
    const group = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!
    const hasConstraintModifier = group.modifiers.some(
      m => m.type === 'set' && (m.field === 'value' || m.field === 'hidden') && m.conditions.length > 0
    )
    expect(hasConstraintModifier).toBe(true)
  })
})

// ---- Task 6: profiles and rules ----

const CAT_WITH_PROFILE_JSON = JSON.stringify({
  catalogue: {
    id: 'cat-001', name: 'Test', revision: '1', battleScribeVersion: '2.03',
    gameSystemId: 'gst-001', gameSystemRevision: '1',
    rules: [
      { id: 'rule-001', name: 'And They Shall Know No Fear', hidden: false, description: 'Units with this rule may re-roll Morale tests.' },
    ],
    sharedSelectionEntries: [
      {
        id: 'se-001', name: 'Bolt Pistol', hidden: false, collective: false, import: true, type: 'upgrade',
        profiles: [
          {
            id: 'prf-001', name: 'Bolt Pistol', hidden: false, typeId: 'type-weapon', typeName: 'Ranged Weapon',
            characteristics: [
              { name: 'Range', typeId: 'chr-range', $text: '12"' },
              { name: 'Str', typeId: 'chr-str', $text: '4' },
              { name: 'AP', typeId: 'chr-ap', $text: '5' },
            ],
          },
        ],
      },
    ],
  },
})

describe('parseToIr (JSON source) - profiles and rules', () => {
  const files = { 'system.json': GST_HEADER_JSON, 'cat.json': CAT_WITH_PROFILE_JSON }

  it('parses a catalogue-level shared rule with description', () => {
    const ir = parseToIr(files)
    expect(ir.catalogues[0]!.root.rules).toHaveLength(1)
    expect(ir.catalogues[0]!.root.rules[0]).toMatchObject({
      id: 'rule-001',
      name: 'And They Shall Know No Fear',
      hidden: false,
      description: 'Units with this rule may re-roll Morale tests.',
    })
  })

  it('parses a profile with typeName', () => {
    const ir = parseToIr(files)
    const entry = ir.catalogues[0]!.root.sharedSelectionEntries[0]!
    expect(entry.profiles).toHaveLength(1)
    expect(entry.profiles[0]).toMatchObject({
      id: 'prf-001', name: 'Bolt Pistol', typeName: 'Ranged Weapon',
    })
  })

  it('retains all characteristics on the profile, reading $text as the value', () => {
    const ir = parseToIr(files)
    const chars = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.profiles[0]!.characteristics
    expect(chars).toHaveLength(3)
    expect(chars.find(c => c.name === 'Range')?.value).toBe('12"')
    expect(chars.find(c => c.name === 'Str')?.value).toBe('4')
  })
})

// ---- Task 7: catalogue metadata ----

const GST_FULL_JSON = JSON.stringify({
  gameSystem: {
    id: 'gst-001', name: 'My System', revision: '1', battleScribeVersion: '2.03',
    costTypes: [
      { id: 'pts-id', name: 'pts', defaultCostLimit: -1 },
    ],
    profileTypes: [
      {
        id: 'ptype-unit', name: 'Unit',
        characteristicTypes: [
          { id: 'chr-ws', name: 'WS' },
          { id: 'chr-bs', name: 'BS' },
        ],
      },
    ],
    categoryEntries: [
      { id: 'cat-troop', name: 'Troops', hidden: false },
    ],
    sharedSelectionEntryGroups: [
      {
        id: 'seg-shared-001', name: 'Shared Wargear Group', hidden: false, collective: false, import: true,
        constraints: [
          { id: 'cst-sg1', type: 'max', value: 3, scope: 'unit', field: 'selections', shared: false, includeChildSelections: false },
        ],
      },
    ],
    entryLinks: [
      { id: 'root-el-001', name: 'Tactical Squad', hidden: false, collective: false, import: true, targetId: 'se-tactical', type: 'selectionEntry' },
    ],
  },
})

describe('parseToIr (JSON source) - catalogue metadata', () => {
  const files = { 'system.json': GST_FULL_JSON, 'cat.json': CAT_HEADER_JSON }

  it('parses costTypes', () => {
    const ir = parseToIr(files)
    expect(ir.gameSystem.root.costTypes).toHaveLength(1)
    expect(ir.gameSystem.root.costTypes[0]).toMatchObject({ id: 'pts-id', name: 'pts', defaultCostLimit: -1 })
  })

  it('parses profileTypes with characteristicTypes', () => {
    const ir = parseToIr(files)
    const pt = ir.gameSystem.root.profileTypes[0]!
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
    const seg = ir.gameSystem.root.sharedSelectionEntryGroups[0]!
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

// ---- flatten attribute on entryLinks ----

const CAT_WITH_FLATTEN_JSON = JSON.stringify({
  catalogue: {
    id: 'cat-001', name: 'Test', revision: '1', battleScribeVersion: '2.03',
    gameSystemId: 'gst-001', gameSystemRevision: '1',
    sharedSelectionEntries: [
      {
        id: 'se-001', name: 'Palatine', hidden: false, collective: false, import: true, type: 'unit',
        selectionEntryGroups: [
          {
            id: 'seg-001', name: 'May exchange blade for:', hidden: false, collective: false, import: true,
            entryLinks: [
              { id: 'el-flat', name: 'Power Weapon', hidden: false, import: true, targetId: 'seg-shared-pw', type: 'selectionEntryGroup', flatten: true },
              { id: 'el-plain', name: 'Phoenix rapier', hidden: false, import: true, targetId: 'se-rapier', type: 'selectionEntry' },
            ],
          },
        ],
      },
    ],
  },
})

describe('parseToIr (JSON source) - flatten attribute', () => {
  const files = { 'system.json': GST_HEADER_JSON, 'cat.json': CAT_WITH_FLATTEN_JSON }

  it('preserves flatten=true on a group link and defaults to false when absent', () => {
    const ir = parseToIr(files)
    const links = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!.entryLinks
    const byId = Object.fromEntries(links.map(l => [l.id, l]))
    expect(byId['el-flat']!.flatten).toBe(true)
    expect(byId['el-plain']!.flatten).toBe(false)
  })
})

const CAT_WITH_FLATTEN_GROUP_JSON = JSON.stringify({
  catalogue: {
    id: 'cat-001', name: 'Test', revision: '1', battleScribeVersion: '2.03',
    gameSystemId: 'gst-001', gameSystemRevision: '1',
    sharedSelectionEntryGroups: [
      { id: 'seg-flat', name: 'Power Weapon', hidden: false, collective: false, import: true, flatten: true },
      { id: 'seg-plain', name: 'Melee Weapon', hidden: false, collective: false, import: true },
    ],
  },
})

describe('parseToIr (JSON source) - flatten attribute on groups', () => {
  const files = { 'system.json': GST_HEADER_JSON, 'cat.json': CAT_WITH_FLATTEN_GROUP_JSON }

  it('preserves flatten=true on a selectionEntryGroup and defaults to false when absent', () => {
    const ir = parseToIr(files)
    const groups = ir.catalogues[0]!.root.sharedSelectionEntryGroups
    const byId = Object.fromEntries(groups.map(g => [g.id, g]))
    expect(byId['seg-flat']!.flatten).toBe(true)
    expect(byId['seg-plain']!.flatten).toBe(false)
  })
})

// ---- defaultSelectionEntryId (real-world bug class this parser must preserve verbatim) ----

const CAT_WITH_DEFAULT_ID_JSON = JSON.stringify({
  catalogue: {
    id: 'cat-001', name: 'Test', revision: '1', battleScribeVersion: '2.03',
    gameSystemId: 'gst-001', gameSystemRevision: '1',
    sharedSelectionEntries: [
      {
        id: 'se-001', name: 'Veteran Despoiler', hidden: false, collective: false, import: true, type: 'model',
        selectionEntryGroups: [
          {
            id: 'seg-001', name: 'May exchange bolt pistol for:', hidden: false, collective: false, import: true,
            defaultSelectionEntryId: '38ad-3258-60c4-072e',
            entryLinks: [
              { id: 'a3bf-4969-9456-288e', name: 'Bolt pistol', hidden: false, import: true, targetId: '2942-f783-d627-33c5', type: 'selectionEntry' },
            ],
          },
        ],
      },
    ],
  },
})

describe('parseToIr (JSON source) - defaultSelectionEntryId', () => {
  it('preserves defaultSelectionEntryId verbatim, even when dangling (not this parser\'s job to validate it)', () => {
    const ir = parseToIr({ 'system.json': GST_HEADER_JSON, 'cat.json': CAT_WITH_DEFAULT_ID_JSON })
    const group = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!
    expect(group.defaultSelectionEntryId).toBe('38ad-3258-60c4-072e')
  })

  it('omits defaultSelectionEntryId when the group carries none', () => {
    const ir = parseToIr({ 'system.json': GST_HEADER_JSON, 'cat.json': CAT_WITH_GROUP_AND_LINK_JSON })
    const group = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!
    expect(group.defaultSelectionEntryId).toBeUndefined()
  })
})

// ---- infoLink modifiers ----

const CAT_WITH_INFOLINK_MODIFIER_JSON = JSON.stringify({
  catalogue: {
    id: 'cat-001', name: 'Test', revision: '1', battleScribeVersion: '2.03',
    gameSystemId: 'gst-001', gameSystemRevision: '1',
    sharedSelectionEntries: [
      {
        id: 'se-001', name: 'Tactical Legionary', hidden: false, collective: false, import: true, type: 'unit',
        infoLinks: [
          {
            id: 'il-001', name: 'Bolter', hidden: false, targetId: 'shared-bolter', type: 'selectionEntry',
            modifiers: [
              { type: 'replace', field: 'name', value: 'Renamed Bolter' },
            ],
          },
        ],
      },
    ],
  },
})

describe('parseToIr (JSON source) - infoLink modifiers', () => {
  const files = { 'system.json': GST_HEADER_JSON, 'cat.json': CAT_WITH_INFOLINK_MODIFIER_JSON }

  it('retains the replace|name modifier on an infoLink', () => {
    const ir = parseToIr(files)
    const infoLink = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.infoLinks[0]!
    expect(infoLink.modifiers).toHaveLength(1)
    expect(infoLink.modifiers[0]).toMatchObject({ type: 'replace', field: 'name', value: 'Renamed Bolter' })
  })

  it('captures the arg attribute on a parameterized replace|name modifier', () => {
    const withArg = JSON.parse(CAT_WITH_INFOLINK_MODIFIER_JSON)
    withArg.catalogue.sharedSelectionEntries[0].infoLinks[0].modifiers[0] = { type: 'replace', value: 2, field: 'name', arg: 'X' }
    const ir = parseToIr({ 'system.json': GST_HEADER_JSON, 'cat.json': JSON.stringify(withArg) })
    const infoLink = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.infoLinks[0]!
    expect(infoLink.modifiers[0]).toMatchObject({ type: 'replace', field: 'name', value: 2, arg: 'X' })
  })

  it('omits arg when the modifier does not carry one', () => {
    const ir = parseToIr(files)
    const infoLink = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.infoLinks[0]!
    expect(infoLink.modifiers[0]!.arg).toBeUndefined()
  })
})
