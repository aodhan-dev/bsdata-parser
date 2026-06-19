/**
 * BSData intermediate representation (IR).
 *
 * The IR is a FAITHFUL, lossless-by-intent tree mirror of the BSData `.gst` / `.cat` model:
 * catalogues, shared selection/entry groups, entry links, modifiers, constraints, costs and
 * conditions, preserved as-is with their ids and references intact. Nothing is resolved or
 * flattened at this layer. Conditions a naive flatten would drop (the "lossy flatten" problem the
 * rebuild exists to fix) are retained here verbatim and resolved later, at projection time.
 *
 * Keep this layer dumb and domain-agnostic: parse -> IR is a mechanical transcription of the XML.
 * All interpretation belongs in the projection (`src/project`), not here.
 */

/** A single parsed BSData file (game system or catalogue), keyed by its filename in the source set. */
export interface IrCatalogueFile {
  filename: string
  /** `gameSystem` for the `.gst`, otherwise `catalogue`. */
  kind: 'gameSystem' | 'catalogue'
  id: string
  name: string
  /** Raw, un-interpreted node tree. Shape is filled in as the parser grows; `unknown` for now. */
  root: unknown
}

/** The whole parsed source set: the game system plus every catalogue. */
export interface Ir {
  gameSystem: IrCatalogueFile
  catalogues: IrCatalogueFile[]
}
