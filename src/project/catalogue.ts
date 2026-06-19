import type { Ir } from '../ir/types.ts'
import type { RawCatalogue } from './types.ts'
import { projectCategories, projectParentFactions, projectFactionAllegiance } from './categories.ts'
import { projectDetachments, projectRites, projectDoctrines, projectPrimeBenefits, projectFactionPrimeBenefits } from './force-org.ts'
import { projectUnits } from './units.ts'
import { projectGlossary, projectOaths, projectAssets, projectShatteredLegions, projectFactionRewardsOfTreachery } from './misc.ts'

/**
 * IR -> downstream projection.
 *
 * Projects the faithful IR into the flattened, ready-to-consume shape the downstream application
 * needs. ALL domain interpretation lives here; the IR and parser stay domain-agnostic. The concrete
 * projector and its reference data are supplied locally and are never committed to this repo (see
 * README) -- this repo ships the framework, not any specific data model.
 *
 * "Superset" is the contract: the projection MUST reproduce every field the reference output carries
 * (so the existing consumer keeps working unchanged), and MAY add fields the current consumer lacks.
 * The golden-diff harness asserts the reproduction half; new fields are additive and ignored.
 */
export function projectCatalogue(ir: Ir): RawCatalogue {
  return {
    categories: projectCategories(ir),
    parentFactions: projectParentFactions(ir),
    factionAllegiance: projectFactionAllegiance(ir),
    detachments: projectDetachments(ir),
    rites: projectRites(ir),
    doctrines: projectDoctrines(ir),
    primeBenefits: projectPrimeBenefits(ir),
    factionPrimeBenefits: projectFactionPrimeBenefits(ir),
    units: projectUnits(ir),
    glossary: projectGlossary(ir),
    oaths: projectOaths(ir),
    assets: projectAssets(ir),
    shatteredLegions: projectShatteredLegions(ir),
    factionRewardsOfTreachery: projectFactionRewardsOfTreachery(ir),
  }
}
