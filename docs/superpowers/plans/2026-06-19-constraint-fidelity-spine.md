# Constraint-fidelity spine (plan)

Status: ready to execute
Date: 2026-06-19
Method: TDD against the BSData XML as source of truth (see `CLAUDE.md`). Golden-parity test is the
integration gate; per-entity unit tests are the inner loop.

## Why this exists

The rebuild's whole reason to exist is to stop the **lossy flatten**. A naive parser collapses
BSData's layered constraint structure into a single overloaded cap (a `max` field with `-1`
overloaded to mean "no constraint"), then the downstream consumer falls back to total model count.
The real caps live on the `entryLink` and the `selectionEntryGroup` at different scopes, get
dropped, and the consumer over-permits. This is the root cause of the recurring "missing/extra
option" class of bug.

The fix is structural, not a patch: the parser retains the constraint layer faithfully in the IR,
and the projection resolves scope into semantic caps. Conditions a naive flatten would drop are
kept verbatim in the IR and represented (not evaluated) at projection time.

## What BSData encodes (three layers)

A `.cat`/`.gst` is rules-as-data with three layers. The rebuild treats them as:

1. **Entities** - selection entries, profiles, costs, links. Mechanical transcription.
2. **Constraints** - `min`/`max` with a `scope`, attached to a `selectionEntryGroup`, an
   `entryLink`, or an individual selection entry/option. **This is the layer the flatten drops and
   the layer this plan is about.**
3. **Modifiers + conditions** - change a constraint's value when a condition holds. Retained
   verbatim in the IR, **not evaluated**; surfaced only as a marker at projection time (deferred).

## Architecture split (where each layer lands)

- **`src/parse` -> IR.** Faithful, domain-agnostic transcription. Every constraint is kept with its
  raw `type` (min/max), `value`, raw `scope` string, and the node it hangs on (group / link /
  option), plus the nesting context needed to resolve scope later. Modifiers and conditions are
  copied verbatim as opaque IR nodes. **No scope resolution, no `-1` sentinel, no collapse.**
- **`src/project` -> output.** All interpretation. Resolves raw scope into semantic caps, computes
  effective caps, and flags conditional caps. Reproduces the oracle as a superset.

Keep the IR dumb: if a value is being *interpreted* rather than *copied*, it belongs in the
projection.

## IR: what the parser must retain (parse layer)

Extend `src/ir/types.ts` from `root: unknown` toward a faithful node tree. The constraint-bearing
shape, mirroring the XML 1:1:

- A constraint node: `{ type: 'min' | 'max', value: number, scope: string, field?: string, id?: string }`.
  `scope` is the **raw** BSData string (`parent`, `unit`, `roster`, `force`, or an id), preserved
  as-is. No resolution here.
- Constraints attach where the XML puts them: on a `selectionEntryGroup`, on an `entryLink`, or on a
  `selectionEntry`/option. The IR records the attachment point and its parent chain so the
  projection can tell whether `parent` means "the model entry" or "the unit".
- Modifier nodes and their condition trees are copied verbatim into the IR as opaque sub-trees. The
  parser does not interpret a single one.

Invariant: the IR for a file is reconstructible back to the same set of constraints the XML carries.
Nothing is summarised, defaulted, or dropped at this layer.

## Projection: scope resolution and effective caps (project layer)

The projection turns raw scope + attachment context into semantic caps. `scope="parent"` is
contextual: it means the immediately containing selection, which is the model when the constraint
sits inside a model entry and the unit when it sits at unit level. The parser knows the nesting, so
the projection resolves it deterministically.

Resolution rules ("raw location + scope" then the projected field):

- group/link, `scope=parent`, parent is a model: `perModelMax` / `perModelMin`.
- group/link, `scope=parent`, parent is the unit: `unitMax` / `unitMin`.
- group/link, `scope=unit`: `unitMax` / `unitMin`.
- option/link, `scope=parent`, parent is a model: option `perModelMax`.
- option/link, `scope=unit`: option `unitMax` / `unitMin`.
- any node, `scope=roster`: `rosterMax` (army-wide).
- any node, `scope=force`: `forceMax` (per-detachment).

Absent cap = unbounded by that scope (NOT "fall back to model count"). The `-1` sentinel does not
exist in the projected output.

Projected fields (replacing any single overloaded `max`):

- Group: `unitMax`, `unitMin`, `perModelMax`, `perModelMin`, `rosterMax`, `forceMax`, plus the
  existing ratio/per-model shaping fields, plus `hasConditionalCaps`.
- Option: `unitMax`, `perModelMax`, `unitMin`, plus `hasConditionalCaps`.

Effective cap (what a consumer enforces) is the *minimum* of the applicable resolved caps given the
current unit size: `perModelMax * modelCount` (if set), `unitMax` (if set), and the ratio cap if the
group is ratio-shaped. Per option, the option's own `unitMax` and `perModelMax * modelCount` apply.
This computation lives in the projection (or is exposed for the consumer to compute); the golden
diff pins its inputs.

### Conditional caps (layer 3, deferred)

When a constraint's value can change under a retained modifier/condition, the projected group/option
carries `hasConditionalCaps = true`. The **static** cap is authoritative in the output; the flag
marks that a downstream consumer may want to surface a soft "may change" note. The condition is
**never evaluated** in this repo. The IR retains it; the projection only sets the flag.

## TDD slices (execution order)

Each slice is red-first: read the BSData node, establish the expected value from the XML, write the
assertion, then implement until green. Keep the golden-parity test moving toward green throughout.

1. **IR constraint nodes.** Parser retains a single `max` constraint on a group with its raw scope
   and attachment point. Unit test on a small fixture: the constraint survives into the IR
   unmodified.
2. **IR link + option constraints.** Same for constraints on an `entryLink` and on an individual
   option, including a node carrying two constraints at different scopes (per-model and per-unit).
   Assert both survive; neither is collapsed.
3. **IR modifier/condition retention.** A node whose constraint has a conditional `set value`
   modifier: assert the modifier + condition sub-tree is present verbatim in the IR and the static
   constraint is also present.
4. **Projection: scope resolution.** A group whose link carries `perModelMax` and `unitMax` projects
   both fields with the right values (not a single `max`, no `-1`). A 10-model unit's effective cap
   on that group computes to the per-unit cap, not model count.
5. **Projection: per-option caps.** An option carrying its own per-unit cap projects that cap
   independently of the group total.
6. **Projection: mandatory + pick-one.** A one-per-model mandatory entry projects
   `perModelMin = perModelMax = 1`. A pick-exactly-one group projects `unitMin == unitMax == 1`.
7. **Projection: conditional flag.** A group/option whose static cap can change under a retained
   modifier projects `hasConditionalCaps = true` with the static cap intact; the condition is not
   evaluated.
8. **No sentinel.** Assert no projected group carries the old `-1` "no constraint" sentinel anywhere
   in the built output.

## Acceptance

- Golden-parity test reproduces every constraint field the oracle carries (superset contract).
- Every constraint present in the BSData XML is present in the IR (no drops at the parse layer).
- The flatten bug is closed: a multi-model unit's effective per-unit cap matches the BSData
  source, not the model count.
- Conditions are retained in the IR and flagged (never evaluated) in the projection.

## Out of scope

- Conditional modifier *evaluation* (deferred; flagged only via `hasConditionalCaps`).
- The downstream consumer's runtime data path (how/where the XML is fetched and cached). That is the
  consumer's concern; this repo is parser + golden-diff framework only.
- Any enforcement UI. This repo produces the projected caps; enforcing them is the consumer's job.

## Reference

Distilled from the source design specs kept local-only at `docs/_local-specs/` (gitignored, they
name the downstream game/IP). This plan is the domain-agnostic, committable form.
