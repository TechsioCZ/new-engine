# Primitives strategy for Figma ↔ code token binding

How spacing, typography, radius, border-width, and other sizing primitives are handled in the Figma export → code pipeline, including the fluid-responsive (Utopia clamp) tokens.

## The problem

Figma variables hold **single values per mode**. The code uses **fluid `clamp(min, mid + vw, max)`** for spacing and typography so the UI scales gracefully between mobile and desktop breakpoints. When the figma-token-binding skill writes literal values into component CSS, the fluid scaling is lost — every padding, spacing, and font size becomes static.

## Two strategies

### Strategy A — Figma owns min + max

Make Figma the source of truth for the fluid envelope:

- Add a 2nd axis to the Semantic collection's modes: `Light-min` / `Light-max` / `Dark-min` / `Dark-max` (4 modes) — or a separate `Min` / `Max` mode pair if L = D for sizing.
- Each primitive (`spacing/200`, `text/md`, …) carries two values; the splitter reads both and emits `clamp(min, midpoint+vw, max)` into `_spacing.css` / `_typography.css`.
- Component atoms then **alias the primitives** (`--text-button-sm: var(--text-sm)`).

**Trade-offs**
- ✅ Figma is end-to-end source of truth.
- ❌ Requires Figma schema work (mode reshape).
- ❌ Splitter has to encode the Utopia midpoint/vw formula.
- ❌ Cross-collection coordination: every per-component collection needs the same min/max axis.

### Strategy B — Code owns fluid, atoms alias primitives  *(current)*

Keep Utopia `clamp()` in the code primitives. The script detects when a Figma-exported atom value matches a known primitive's value and emits `var(--primitive)` instead of the literal.

```css
/* Before (literal from Figma) — fluid scaling lost */
--text-input-sm: 1rem;

/* After (Strategy B alias) — restores fluid scaling */
--text-input-sm: var(--text-sm);
/* resolves to clamp(0.9375rem, 0.9158rem + 0.1087vw, 1rem) */
```

**Trade-offs**
- ✅ Zero Figma changes.
- ✅ Restores fluid scaling for all migrated atoms immediately.
- ✅ Matches the two-layer convention in CLAUDE.md (reference layer = primitive, derived layer = component).
- ✅ Mechanically simple — one lookup table, deterministic mapping.
- ⚠ Figma's typography/spacing numbers are decorative for designers — they don't drive runtime output.
- ⚠ When you change a primitive value in code, designers won't see it in Figma until they sync manually.

## Current implementation (Strategy B)

`apply-light-dark.mjs` maps Figma single values to primitive aliases per property prefix:

| Figma token kind | Looks up in | Emits if match |
|---|---|---|
| `--text-{comp}-{size}` | `--text-{xs,sm,md,lg,xl,2xl}` max | `var(--text-{size})` |
| `--padding-{comp}-…` | `--spacing-{50,100,150,200,250,…}` max | `var(--spacing-{n})` |
| `--spacing-{comp}-…` | `--spacing-*` max | `var(--spacing-{n})` |
| `--radius-{comp}-{size}` | `--radius-{none,sm,md,lg,full}` | `var(--radius-{size})` |
| `--border-width-{comp}-…` | `--border-width-{sm,md,lg}` | `var(--border-width-{n})` |

Mapping is exact-string against rem values that Figma writes (e.g., `1rem`, `0.94rem`). Borderline cases (where the Figma rounding deviates from the clamp max by < 1px) are matched explicitly in the lookup table; everything else falls through to the literal.

The mapping table lives at the top of `apply-light-dark.mjs` as `PRIMITIVE_ALIAS_BY_PREFIX`. Update it when adding new primitive scales.

## Decision rule, per token

When the script sees `--<prefix>-<comp>-<rest>: <value>` in a component file, it tries in order:

1. Is the value identical to a sibling reference-layer token (`--color-X-{bg|fg|border}-Y` ↔ `--color-X-Y`)?
   → emit `var(--ref)` (CLAUDE.md two-layer convention)
2. Does the value (with L = D) match a known primitive of the same property kind?
   → emit `var(--primitive)` (this strategy)
3. Does L ≠ D in Figma?
   → emit `light-dark(L, D)`
4. Default
   → emit the literal value

## What this does not cover

- **OKLCH derivation chains** (`oklch(from var(--X) calc(l + var(--state-hover)) c h)`) — Figma can't compute these. They live in `_semantic.css`.
- **Breakpoints, aspect ratios, shadows** — not in Figma. Stay code-owned.
- **`--text-3xl`, `--text-4xl`** — used in code, missing from Figma. Designers should add them to Figma if needed.
- **Border width naming mismatch** — Figma uses `border/sm`, code uses `border-width-sm`. The script handles the prefix dispatch internally; consider renaming in Figma for consistency.

## When to migrate to Strategy A

Migrate when one of these is true:
- Designers start changing fluid envelopes in code reviews instead of in Figma.
- The primitives table in `apply-light-dark.mjs` grows past ~30 entries.
- A new project adopts the binding workflow with different breakpoints — the in-code clamp formulas become per-project rather than shared.

When that happens:
1. Add the `Min` / `Max` modes to the Semantic collection in Figma.
2. Write a new splitter that emits `_spacing.css` / `_typography.css` from the min+max export.
3. Remove the primitive alias lookup from `apply-light-dark.mjs` — atom values will already match primitives because both come from Figma.
4. Re-run on all atoms; the existing alias detection collapses duplicated values.

## Related references

- Skill workflow: [`./SKILL.md`](./SKILL.md)
- Visual diagram: regenerate via `.agents/skills/figma-token-binding/...` (or local `libs/ui/THEME-FLOW.md`)
- Codebase convention: `libs/ui/CLAUDE.md` (two-layer reference → derived)
