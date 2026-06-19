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
