import type {
  IrCatalogueFile, IrCatalogueRoot,
  IrConstraint, IrCost, IrProfile, IrCharacteristic,
  IrRule, IrInfoLink, IrCategoryLink,
  IrModifier, IrModifierGroup, IrCondition, IrConditionGroup, IrRepeat,
  IrSelectionEntry, IrSelectionEntryGroup, IrEntryLink,
  IrCostType, IrProfileType, IrCategoryEntry,
  IrEntryType,
  IrForceCategoryLink, IrForceEntry,
  IrCatalogueLink,
} from '../ir/types.ts'

// BSData's JSON export (migrated from XML 2026-07-14) is a direct tree mirror of the XML schema:
// same element/attribute names, same nesting depth, but attributes are plain object keys (no `@_`
// prefix), element text content is `$text` (not `#text`), and child collections are flat arrays
// under the plural key directly - there is no intermediate singular-tag wrapper the way parsed XML
// has it (XML's <selectionEntries><selectionEntry/></selectionEntries> becomes, under fast-xml-parser,
// {selectionEntries: {selectionEntry: [...]}}; the JSON export is just {selectionEntries: [...]}).
// Verified against a real BSData JSON export, not assumed.

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
    id: String(n.id ?? ''),
    type: n.type === 'min' ? 'min' : 'max',
    value: Number(n.value ?? 0),
    scope: String(n.scope ?? ''),
    field: String(n.field ?? 'selections'),
    shared: bool(n.shared),
    includeChildSelections: bool(n.includeChildSelections),
  }
}

function parseCost(n: any): IrCost {
  return {
    name: String(n.name ?? ''),
    typeId: String(n.typeId ?? ''),
    value: Number(n.value ?? 0),
  }
}

function parseCharacteristic(n: any): IrCharacteristic {
  const raw = n['$text']
  return {
    name: String(n.name ?? ''),
    typeId: String(n.typeId ?? ''),
    value: raw != null ? String(raw) : '',
  }
}

function parseProfile(n: any): IrProfile {
  return {
    id: String(n.id ?? ''),
    name: String(n.name ?? ''),
    hidden: bool(n.hidden),
    typeId: String(n.typeId ?? ''),
    typeName: String(n.typeName ?? ''),
    characteristics: arr<any>(n.characteristics).map(parseCharacteristic),
  }
}

function parseRule(n: any): IrRule {
  return {
    id: String(n.id ?? ''),
    name: String(n.name ?? ''),
    hidden: bool(n.hidden),
    description: n.description != null ? String(n.description) : '',
  }
}

function parseInfoLink(n: any): IrInfoLink {
  const mg = arr<any>(n.modifierGroups).map(parseModifierGroup)
  return {
    id: String(n.id ?? ''),
    name: String(n.name ?? ''),
    hidden: bool(n.hidden),
    targetId: String(n.targetId ?? ''),
    type: String(n.type ?? ''),
    modifiers: arr<any>(n.modifiers).map(parseModifier),
    ...(mg.length > 0 ? { modifierGroups: mg } : {}),
  }
}

function parseCategoryLink(n: any): IrCategoryLink {
  return {
    id: String(n.id ?? ''),
    targetId: String(n.targetId ?? ''),
    primary: bool(n.primary),
  }
}

function parseCondition(n: any): IrCondition {
  const out: IrCondition = {
    type: String(n.type ?? ''),
    value: Number(n.value ?? 0),
    field: String(n.field ?? ''),
    scope: String(n.scope ?? ''),
  }
  if (n.childId != null) out.childId = String(n.childId)
  if (n.shared != null) out.shared = bool(n.shared)
  if (n.includeChildSelections != null) out.includeChildSelections = bool(n.includeChildSelections)
  if (n.percentValue != null) out.percentValue = bool(n.percentValue)
  return out
}

function parseConditionGroup(n: any): IrConditionGroup {
  return {
    type: String(n.type ?? ''),
    conditions: arr<any>(n.conditions).map(parseCondition),
    conditionGroups: arr<any>(n.conditionGroups).map(parseConditionGroup),
  }
}

function parseRepeat(n: any): IrRepeat {
  const out: IrRepeat = {
    value: Number(n.value ?? 0),
    repeats: Number(n.repeats ?? 0),
    field: String(n.field ?? ''),
    scope: String(n.scope ?? ''),
  }
  if (n.childId != null) out.childId = String(n.childId)
  if (n.shared != null) out.shared = bool(n.shared)
  if (n.includeChildSelections != null) out.includeChildSelections = bool(n.includeChildSelections)
  if (n.roundUp != null) out.roundUp = bool(n.roundUp)
  return out
}

function parseModifier(n: any): IrModifier {
  const out: IrModifier = {
    type: String(n.type ?? ''),
    field: String(n.field ?? ''),
    value: n.value ?? '',
    conditions: arr<any>(n.conditions).map(parseCondition),
    conditionGroups: arr<any>(n.conditionGroups).map(parseConditionGroup),
    repeats: arr<any>(n.repeats).map(parseRepeat),
  }
  if (n.arg != null) out.arg = String(n.arg)
  return out
}

function parseModifierGroup(n: any): IrModifierGroup {
  return {
    type: String(n.type ?? 'and'),
    modifiers: arr<any>(n.modifiers).map(parseModifier),
    conditions: arr<any>(n.conditions).map(parseCondition),
    conditionGroups: arr<any>(n.conditionGroups).map(parseConditionGroup),
    modifierGroups: arr<any>(n.modifierGroups).map(parseModifierGroup),
  }
}

// ---- structural node parsers (mutually recursive) ----

function parseSelectionEntry(n: any): IrSelectionEntry {
  const mg = arr<any>(n.modifierGroups).map(parseModifierGroup)
  return {
    id: String(n.id ?? ''),
    name: String(n.name ?? ''),
    hidden: bool(n.hidden),
    collective: bool(n.collective),
    import: bool(n.import),
    type: (n.type ?? 'upgrade') as IrEntryType,
    ...(n.defaultAmount != null ? { defaultAmount: Number(n.defaultAmount) } : {}),
    constraints: arr<any>(n.constraints).map(parseConstraint),
    profiles: arr<any>(n.profiles).map(parseProfile),
    rules: arr<any>(n.rules).map(parseRule),
    infoLinks: arr<any>(n.infoLinks).map(parseInfoLink),
    categoryLinks: arr<any>(n.categoryLinks).map(parseCategoryLink),
    costs: arr<any>(n.costs).map(parseCost),
    modifiers: arr<any>(n.modifiers).map(parseModifier),
    ...(mg.length > 0 ? { modifierGroups: mg } : {}),
    selectionEntries: arr<any>(n.selectionEntries).map(parseSelectionEntry),
    selectionEntryGroups: arr<any>(n.selectionEntryGroups).map(parseSelectionEntryGroup),
    entryLinks: arr<any>(n.entryLinks).map(parseEntryLink),
  }
}

function parseSelectionEntryGroup(n: any): IrSelectionEntryGroup {
  const mg = arr<any>(n.modifierGroups).map(parseModifierGroup)
  return {
    id: String(n.id ?? ''),
    name: String(n.name ?? ''),
    hidden: bool(n.hidden),
    collective: bool(n.collective),
    import: bool(n.import),
    flatten: bool(n.flatten),
    ...(n.defaultSelectionEntryId != null
      ? { defaultSelectionEntryId: String(n.defaultSelectionEntryId) }
      : {}),
    constraints: arr<any>(n.constraints).map(parseConstraint),
    rules: arr<any>(n.rules).map(parseRule),
    modifiers: arr<any>(n.modifiers).map(parseModifier),
    ...(mg.length > 0 ? { modifierGroups: mg } : {}),
    selectionEntries: arr<any>(n.selectionEntries).map(parseSelectionEntry),
    selectionEntryGroups: arr<any>(n.selectionEntryGroups).map(parseSelectionEntryGroup),
    entryLinks: arr<any>(n.entryLinks).map(parseEntryLink),
  }
}

function parseEntryLink(n: any): IrEntryLink {
  const mg = arr<any>(n.modifierGroups).map(parseModifierGroup)
  return {
    id: String(n.id ?? ''),
    name: String(n.name ?? ''),
    hidden: bool(n.hidden),
    collective: bool(n.collective),
    import: bool(n.import),
    flatten: bool(n.flatten),
    targetId: String(n.targetId ?? ''),
    type: String(n.type ?? ''),
    ...(n.defaultAmount != null ? { defaultAmount: Number(n.defaultAmount) } : {}),
    ...(n.comment != null ? { comment: String(n.comment).trim() } : {}),
    constraints: arr<any>(n.constraints).map(parseConstraint),
    rules: arr<any>(n.rules).map(parseRule),
    costs: arr<any>(n.costs).map(parseCost),
    modifiers: arr<any>(n.modifiers).map(parseModifier),
    ...(mg.length > 0 ? { modifierGroups: mg } : {}),
    profiles: arr<any>(n.profiles).map(parseProfile),
    infoLinks: arr<any>(n.infoLinks).map(parseInfoLink),
    categoryLinks: arr<any>(n.categoryLinks).map(parseCategoryLink),
    selectionEntries: arr<any>(n.selectionEntries).map(parseSelectionEntry),
    selectionEntryGroups: arr<any>(n.selectionEntryGroups).map(parseSelectionEntryGroup),
    entryLinks: arr<any>(n.entryLinks).map(parseEntryLink),
  }
}

// ---- force entry parsers ----

function parseForceCategoryLink(n: any): IrForceCategoryLink {
  return {
    id: String(n.id ?? ''),
    targetId: String(n.targetId ?? ''),
    primary: bool(n.primary),
    hidden: bool(n.hidden),
    constraints: arr<any>(n.constraints).map(parseConstraint),
  }
}

function parseForceEntry(n: any): IrForceEntry {
  return {
    id: String(n.id ?? ''),
    name: String(n.name ?? ''),
    hidden: bool(n.hidden),
    constraints: arr<any>(n.constraints).map(parseConstraint),
    categoryLinks: arr<any>(n.categoryLinks).map(parseForceCategoryLink),
    rules: arr<any>(n.rules).map(parseRule),
    modifiers: arr<any>(n.modifiers).map(parseModifier),
    forceEntries: arr<any>(n.forceEntries).map(parseForceEntry),
  }
}

// ---- catalogue link parser ----

function parseCatalogueLink(n: any): IrCatalogueLink {
  return {
    id: String(n.id ?? ''),
    name: String(n.name ?? ''),
    targetId: String(n.targetId ?? ''),
    type: String(n.type ?? ''),
    importRootEntries: bool(n.importRootEntries),
  }
}

// ---- catalogue root ----

function parseCatalogueRoot(r: any): IrCatalogueRoot {
  return {
    costTypes: arr<any>(r.costTypes).map((n: any): IrCostType => ({
      id: String(n.id ?? ''),
      name: String(n.name ?? ''),
      defaultCostLimit: Number(n.defaultCostLimit ?? -1),
    })),
    profileTypes: arr<any>(r.profileTypes).map((n: any): IrProfileType => ({
      id: String(n.id ?? ''),
      name: String(n.name ?? ''),
      characteristicTypes: arr<any>(n.characteristicTypes).map((c: any) => ({
        id: String(c.id ?? ''),
        name: String(c.name ?? ''),
      })),
    })),
    categoryEntries: arr<any>(r.categoryEntries).map((n: any): IrCategoryEntry => ({
      id: String(n.id ?? ''),
      name: String(n.name ?? ''),
      hidden: bool(n.hidden),
    })),
    rules: arr<any>(r.rules).map(parseRule),
    sharedRules: arr<any>(r.sharedRules).map(parseRule),
    sharedProfiles: arr<any>(r.sharedProfiles).map(parseProfile),
    selectionEntries: arr<any>(r.selectionEntries).map(parseSelectionEntry),
    sharedSelectionEntries: arr<any>(r.sharedSelectionEntries).map(parseSelectionEntry),
    sharedSelectionEntryGroups: arr<any>(r.sharedSelectionEntryGroups).map(parseSelectionEntryGroup),
    entryLinks: arr<any>(r.entryLinks).map(parseEntryLink),
    forceEntries: arr<any>(r.forceEntries).map(parseForceEntry),
  }
}

// ---- public entry ----

// A raw file's content is JSON when its first non-whitespace character is `{`. BSData's JSON
// export wraps every file in a single root key, exactly like the XML root element: `{"gameSystem":
// {...}}` or `{"catalogue": {...}}`.
export function looksLikeJson(content: string): boolean {
  return content.trimStart().startsWith('{')
}

export function parseFileFromJson(filename: string, json: string): IrCatalogueFile {
  const doc = JSON.parse(json)
  const isGst = 'gameSystem' in doc
  const root = isGst ? doc.gameSystem : doc.catalogue
  const kind: 'gameSystem' | 'catalogue' = isGst ? 'gameSystem' : 'catalogue'
  return {
    filename,
    kind,
    id: String(root.id ?? ''),
    name: String(root.name ?? ''),
    ...(root.gameSystemId != null ? { gameSystemId: String(root.gameSystemId) } : {}),
    catalogueLinks: arr<any>(root.catalogueLinks).map(parseCatalogueLink),
    root: parseCatalogueRoot(root),
  }
}
