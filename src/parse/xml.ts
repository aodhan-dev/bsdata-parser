import { XMLParser } from 'fast-xml-parser'
import type {
  IrCatalogueFile, IrCatalogueRoot,
  IrConstraint, IrCost, IrProfile, IrCharacteristic,
  IrRule, IrInfoLink, IrCategoryLink,
  IrModifier, IrCondition, IrConditionGroup, IrRepeat,
  IrSelectionEntry, IrSelectionEntryGroup, IrEntryLink,
  IrCostType, IrProfileType, IrCategoryEntry,
  IrEntryType,
  IrForceCategoryLink, IrForceEntry,
  IrCatalogueLink,
} from '../ir/types.ts'

const ALWAYS_ARRAY = new Set([
  'selectionEntry', 'selectionEntryGroup', 'entryLink',
  'constraint', 'profile', 'characteristic', 'characteristicType',
  'cost', 'costType', 'profileType',
  'rule', 'categoryLink', 'categoryEntry',
  'infoLink', 'modifier', 'condition', 'conditionGroup', 'repeat',
  'forceEntry', 'catalogueLink',
])

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ALWAYS_ARRAY.has(name),
  parseAttributeValue: true,
})

// ---- helpers ----

function arr<T>(v: unknown): T[] {
  if (!v) return []
  if (Array.isArray(v)) return v as T[]
  return [v as T]
}

function bool(v: unknown): boolean {
  return v === true || v === 'true'
}

// ---- primitive node parsers ----

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

// ---- structural node parsers (mutually recursive) ----

function parseSelectionEntry(n: any): IrSelectionEntry {
  return {
    id: String(n['@_id'] ?? ''),
    name: String(n['@_name'] ?? ''),
    hidden: bool(n['@_hidden']),
    collective: bool(n['@_collective']),
    import: bool(n['@_import']),
    type: (n['@_type'] ?? 'upgrade') as IrEntryType,
    ...(n['@_defaultAmount'] != null ? { defaultAmount: Number(n['@_defaultAmount']) } : {}),
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
    ...(n['@_defaultSelectionEntryId'] != null
      ? { defaultSelectionEntryId: String(n['@_defaultSelectionEntryId']) }
      : {}),
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
    ...(n['@_defaultAmount'] != null ? { defaultAmount: Number(n['@_defaultAmount']) } : {}),
    ...(n.comment != null ? { comment: String(n.comment).trim() } : {}),
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

// ---- force entry parsers ----

function parseForceCategoryLink(n: any): IrForceCategoryLink {
  return {
    id: String(n['@_id'] ?? ''),
    targetId: String(n['@_targetId'] ?? ''),
    primary: bool(n['@_primary']),
    hidden: bool(n['@_hidden']),
    constraints: arr<any>(n.constraints?.constraint).map(parseConstraint),
  }
}

function parseForceEntry(n: any): IrForceEntry {
  return {
    id: String(n['@_id'] ?? ''),
    name: String(n['@_name'] ?? ''),
    hidden: bool(n['@_hidden']),
    categoryLinks: arr<any>(n.categoryLinks?.categoryLink).map(parseForceCategoryLink),
    rules: arr<any>(n.rules?.rule).map(parseRule),
    modifiers: arr<any>(n.modifiers?.modifier).map(parseModifier),
    forceEntries: arr<any>(n.forceEntries?.forceEntry).map(parseForceEntry),
  }
}

// ---- catalogue link parser ----

function parseCatalogueLink(n: any): IrCatalogueLink {
  return {
    id: String(n['@_id'] ?? ''),
    name: String(n['@_name'] ?? ''),
    targetId: String(n['@_targetId'] ?? ''),
    type: String(n['@_type'] ?? ''),
    importRootEntries: bool(n['@_importRootEntries']),
  }
}

// ---- catalogue root ----

function parseCatalogueRoot(r: any): IrCatalogueRoot {
  return {
    costTypes: arr<any>(r.costTypes?.costType).map((n: any): IrCostType => ({
      id: String(n['@_id'] ?? ''),
      name: String(n['@_name'] ?? ''),
      defaultCostLimit: Number(n['@_defaultCostLimit'] ?? -1),
    })),
    profileTypes: arr<any>(r.profileTypes?.profileType).map((n: any): IrProfileType => ({
      id: String(n['@_id'] ?? ''),
      name: String(n['@_name'] ?? ''),
      characteristicTypes: arr<any>(n.characteristicTypes?.characteristicType).map((c: any) => ({
        id: String(c['@_id'] ?? ''),
        name: String(c['@_name'] ?? ''),
      })),
    })),
    categoryEntries: arr<any>(r.categoryEntries?.categoryEntry).map((n: any): IrCategoryEntry => ({
      id: String(n['@_id'] ?? ''),
      name: String(n['@_name'] ?? ''),
      hidden: bool(n['@_hidden']),
    })),
    rules: arr<any>(r.rules?.rule).map(parseRule),
    sharedRules: arr<any>(r.sharedRules?.rule).map(parseRule),
    sharedProfiles: arr<any>(r.sharedProfiles?.profile).map(parseProfile),
    selectionEntries: arr<any>(r.selectionEntries?.selectionEntry).map(parseSelectionEntry),
    sharedSelectionEntries: arr<any>(r.sharedSelectionEntries?.selectionEntry).map(parseSelectionEntry),
    sharedSelectionEntryGroups: arr<any>(r.sharedSelectionEntryGroups?.selectionEntryGroup).map(parseSelectionEntryGroup),
    entryLinks: arr<any>(r.entryLinks?.entryLink).map(parseEntryLink),
    forceEntries: arr<any>(r.forceEntries?.forceEntry).map(parseForceEntry),
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
    ...(root['@_gameSystemId'] != null ? { gameSystemId: String(root['@_gameSystemId']) } : {}),
    catalogueLinks: arr<any>(root.catalogueLinks?.catalogueLink).map(parseCatalogueLink),
    root: parseCatalogueRoot(root),
  }
}
