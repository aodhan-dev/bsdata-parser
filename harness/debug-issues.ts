/**
 * Debug script for force-org issues. Run with:
 * $env:BSDATA_DIR = "D:\Dev\hh3-list-builder\data"; npx tsx harness/debug-issues.ts
 */
import { loadBsdata, loadOracle } from './oracle.ts'
import { buildCatalogue, parseToIr } from '../src/index.ts'

const [files, oracle] = await Promise.all([loadBsdata(), loadOracle()])
const ir = parseToIr(files)
const candidate = buildCatalogue(files)

// 1. Detachments: identify hidden detachments in catalogue forceEntries
console.log('\n=== DETACHMENTS: extra in candidate ===')
const oIds = new Set((oracle.detachments as any[]).map((d: any) => d.id))
const extra = (candidate.detachments as any[]).filter((d: any) => !oIds.has(d.id))
for (const d of extra) {
  console.log('+', d.id, JSON.stringify(d.name), 'faction:', d.faction)
  // Find it in IR to check hidden flag
  for (const cat of ir.catalogues) {
    const findFe = (fe: any): any => {
      if (fe.id === d.id) return fe
      for (const child of fe.forceEntries) {
        const found = findFe(child)
        if (found) return found
      }
      return null
    }
    for (const fe of cat.root.forceEntries) {
      const found = findFe(fe)
      if (found) {
        console.log('  IR hidden:', found.hidden, 'in cat:', cat.name)
        break
      }
    }
  }
}

// 2. factionPrimeBenefits: show name mapping issue
console.log('\n=== factionPrimeBenefits: candidate keys not matching oracle ===')
const oFPB = new Set(Object.keys((oracle as Record<string, unknown>).factionPrimeBenefits as Record<string, unknown>))
const missingFPB = Object.keys(candidate.factionPrimeBenefits ?? {}).filter(k => !oFPB.has(k))
console.log('Candidate keys not in oracle:', missingFPB)
// Show catalogue names for legions
console.log('\nCatalogue names for legions:')
for (const cat of ir.catalogues) {
  if (/dark angels|emperor|iron warriors|blood angels|white scars|space wolves|imperial fists|night lords|iron hands|world eaters|death guard|raven guard|thousand sons|sons of horus|word bearers|salamanders|alpha legion|ultramarines/i.test(cat.name)) {
    console.log(' cat.name:', cat.name)
  }
}

// 3. Doctrines: missing groups for Mechanicum, Questoris, Skitarii
console.log('\n=== DOCTRINES: checking missing factions ===')
const DOCTRINE_NAMES = new Set(['Legio Tactica', 'Cohort Doctrine', 'Divisio Tactica', 'Household Paradigm', 'Knightly Exemplar', 'Provenance', 'Battlefield Doctrine'])

for (const cat of ir.catalogues) {
  if (!/mechanicum|questoris|skitarii/i.test(cat.name)) continue
  console.log('CAT:', cat.name)
  console.log('  sharedSelectionEntryGroups:', cat.root.sharedSelectionEntryGroups.map((g: any) => g.name))
  for (const g of cat.root.sharedSelectionEntryGroups) {
    if (DOCTRINE_NAMES.has(g.name)) {
      console.log('  FOUND doctrine group:', g.name)
    }
    for (const sg of g.selectionEntryGroups) {
      if (DOCTRINE_NAMES.has(sg.name)) {
        console.log('  FOUND nested doctrine group:', sg.name, 'under:', g.name)
      }
    }
  }
  for (const e of cat.root.sharedSelectionEntries) {
    for (const g of e.selectionEntryGroups) {
      if (DOCTRINE_NAMES.has(g.name)) {
        console.log('  FOUND doctrine group in entry:', g.name, 'in entry:', e.name)
      }
    }
  }
}
