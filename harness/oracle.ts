import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Resolves the local data directory used by the golden-diff harness. No game data is bundled with
 * this repo (it is third-party copyrighted content, see .gitignore). Point BSDATA_DIR at a
 * local directory you have assembled yourself, containing:
 *   - `bsdata/`        the BSData `.cat`/`.gst` source set  -> input to the parser
 *   - `catalogue.json` a reference catalogue                -> the oracle to diff against
 */
export function dataDir(): string {
  const dir = process.env.BSDATA_DIR
  if (!dir) {
    throw new Error(
      'Set BSDATA_DIR to a local directory containing bsdata/ and catalogue.json.',
    )
  }
  return dir
}

/** True when a usable data directory is configured, so data-dependent tests can skip cleanly. */
export function hasData(): boolean {
  try {
    return existsSync(join(dataDir(), 'catalogue.json'))
  } catch {
    return false
  }
}

/** The `filename -> XML` map fed to buildCatalogue. */
export async function loadBsdata(): Promise<Record<string, string>> {
  const dir = join(dataDir(), 'bsdata')
  const names = (await readdir(dir)).filter((f) => f.endsWith('.cat') || f.endsWith('.gst'))
  const files: Record<string, string> = {}
  await Promise.all(
    names.map(async (name) => {
      files[name] = await readFile(join(dir, name), 'utf-8')
    }),
  )
  return files
}

/** The reference catalogue: the oracle the rebuild must reproduce as a superset. */
export async function loadOracle(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(dataDir(), 'catalogue.json'), 'utf-8'))
}
