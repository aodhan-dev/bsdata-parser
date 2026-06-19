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

/**
 * A BSData modifierGroup node: a block of modifiers that share a common set of conditions.
 * Equivalent to a conditional modifier block - the conditions guard when ALL the inner modifiers apply.
 */
export interface IrModifierGroup {
  type: string
  modifiers: IrModifier[]
  conditions: IrCondition[]
  conditionGroups: IrConditionGroup[]
  modifierGroups: IrModifierGroup[]
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
  modifierGroups?: IrModifierGroup[]
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
  modifierGroups?: IrModifierGroup[]
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
  comment?: string
  constraints: IrConstraint[]
  costs: IrCost[]
  modifiers: IrModifier[]
  modifierGroups?: IrModifierGroup[]
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

export interface IrForceCategoryLink {
  id: string
  targetId: string
  primary: boolean
  hidden: boolean
  constraints: IrConstraint[]
}

export interface IrForceEntry {
  id: string
  name: string
  hidden: boolean
  constraints: IrConstraint[]
  categoryLinks: IrForceCategoryLink[]
  rules: IrRule[]
  modifiers: IrModifier[]
  forceEntries: IrForceEntry[]
}

export interface IrCostType {
  id: string
  name: string
  defaultCostLimit: number
}

/** A BSData catalogueLink node: references another catalogue this one imports from. */
export interface IrCatalogueLink {
  id: string
  name: string
  targetId: string
  type: string
  importRootEntries: boolean
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
  /** Rules from the BSData &lt;sharedRules&gt; element: the canonical rule-definition pool. */
  sharedRules: IrRule[]
  /** Profiles from the BSData &lt;sharedProfiles&gt; element: abilities with Summary/Description characteristics. */
  sharedProfiles: IrProfile[]
  selectionEntries: IrSelectionEntry[]
  sharedSelectionEntries: IrSelectionEntry[]
  sharedSelectionEntryGroups: IrSelectionEntryGroup[]
  entryLinks: IrEntryLink[]
  forceEntries: IrForceEntry[]
}

/** A single parsed BSData file (game system or catalogue). */
export interface IrCatalogueFile {
  filename: string
  kind: 'gameSystem' | 'catalogue'
  id: string
  name: string
  gameSystemId?: string
  catalogueLinks: IrCatalogueLink[]
  root: IrCatalogueRoot
}

/** The whole parsed source set: the game system plus every catalogue. */
export interface Ir {
  gameSystem: IrCatalogueFile
  catalogues: IrCatalogueFile[]
}
