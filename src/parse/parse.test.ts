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
    expect(ir.catalogues[0]!.kind).toBe('catalogue')
    expect(ir.catalogues[0]!.id).toBe('cat-001')
    expect(ir.catalogues[0]!.gameSystemId).toBe('gst-001')
  })

  it('throws when no .gst is present', () => {
    expect(() => parseToIr({ 'cat.cat': CAT_HEADER })).toThrow('no .gst')
  })
})

// ---- Task 3: constraints ----

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

  it('retains all characteristics on the profile', () => {
    const ir = parseToIr(files)
    const chars = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.profiles[0]!.characteristics
    expect(chars).toHaveLength(3)
    expect(chars.find(c => c.name === 'Range')?.value).toBe('12"')
    expect(chars.find(c => c.name === 'Str')?.value).toBe('4')
  })
})

// ---- Task 7: catalogue metadata ----

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

const CAT_WITH_FLATTEN = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<catalogue id="cat-001" name="Test" revision="1" battleScribeVersion="2.03" gameSystemId="gst-001" gameSystemRevision="1" xmlns="http://www.battlescribe.net/schema/catalogueSchema">
  <sharedSelectionEntries>
    <selectionEntry id="se-001" name="Palatine" hidden="false" collective="false" import="true" type="unit">
      <selectionEntryGroups>
        <selectionEntryGroup id="seg-001" name="May exchange blade for:" hidden="false" collective="false" import="true">
          <entryLinks>
            <entryLink id="el-flat" name="Power Weapon" hidden="false" import="true" targetId="seg-shared-pw" type="selectionEntryGroup" flatten="true"/>
            <entryLink id="el-plain" name="Phoenix rapier" hidden="false" import="true" targetId="se-rapier" type="selectionEntry"/>
          </entryLinks>
        </selectionEntryGroup>
      </selectionEntryGroups>
    </selectionEntry>
  </sharedSelectionEntries>
</catalogue>`

describe('parseToIr - flatten attribute', () => {
  const files = { 'system.gst': GST_HEADER, 'cat.cat': CAT_WITH_FLATTEN }

  it('preserves flatten=true on a group link and defaults to false when absent', () => {
    const ir = parseToIr(files)
    const links = ir.catalogues[0]!.root.sharedSelectionEntries[0]!.selectionEntryGroups[0]!.entryLinks
    const byId = Object.fromEntries(links.map(l => [l.id, l]))
    expect(byId['el-flat']!.flatten).toBe(true)
    expect(byId['el-plain']!.flatten).toBe(false)
  })
})
