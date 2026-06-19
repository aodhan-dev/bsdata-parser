# bsdata-parser (project instructions)

Faithful BSData parser rebuild: BSData XML → IR → downstream projection, validated by a golden-diff
harness against a reference output. See `README.md` for the design. Global rules in
`~/.claude/CLAUDE.md` also apply.

## Public-repo hygiene (hard rule)

- This is a **public** repo. **MUST NOT** commit any third-party game data, any reference output, or
  anything that names or hints at the specific game/IP the downstream consumer targets. Keep the
  committed code domain-agnostic: a BSData parser + a generic golden-diff framework.
- Domain-specific projection code, reference data, and the local data directory are **local only**
  (gitignored or kept outside the repo). They are never committed here.

## Source of truth

- The BSData `.gst`/`.cat` source is the ONLY source of truth for what the parser must reproduce.
  **MUST NOT** invent structure or values from outside the XML.
- The reference output (local `catalogue.json`) is the **golden oracle**: the rebuild must reproduce
  every field it carries (superset contract). Where the oracle and the BSData XML disagree, the XML
  wins and that is a bug the rebuild fixes (log it, do not silently diverge).

## Method

- **MUST** build `src/parse` and `src/project` test-first (red-green-refactor) against the BSData
  XML. Establish the expected value by reading the source before writing the assertion.
- The golden-parity test (`harness/golden-parity.test.ts`) is the integration gate; per-entity unit
  tests are the inner loop. Keep both green as the projection grows.
- Keep the IR dumb and domain-agnostic (mechanical XML transcription). All interpretation belongs in
  the projection.

## Integration

- `buildCatalogue(files)` stays signature-compatible with the downstream consumer's build so the
  rebuild can be wired in incrementally (swap the import, keep the golden diff green).
