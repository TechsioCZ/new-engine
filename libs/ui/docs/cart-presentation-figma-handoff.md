# PR10 cart presentation: Figma handoff

LineItem and TotalsSummary implement audit C01/C02. Both are presentational; application formatting, shipping selection, inventory, totals and mutations remain application-owned.

## Component ownership

LineItem is a client module because its compound parts share React context.
Next.js consumers compose the whole row inside a `"use client"` wrapper, even
for read-only recaps. Server Components pass serializable data to that wrapper.

- LineItem is a compound organism. Root shares title, layout, pending and readOnly. Image, Body, Heading, Title, Price, Options and Controls arrange application-provided content. Quantity requires readOnlyLabel and replaces editable children with text in readOnly. Actions omits mutation controls in readOnly and blocks them while pending. Remove uses a localized label containing the root product name, is omitted in readOnly and disabled while pending. Root pending feedback is automatic. AvailabilityStatus and StatusText can be inserted directly; image, price and actions can be omitted or rearranged.
- TotalsSummary is a molecule. It renders supplied label/value rows and notes in a definition list, a separately labeled total, optional footer and actions. Pending preserves the supplied values and blocks actions. An unresolved fee must be supplied as text such as `Choose delivery`, not assumed to be zero.

## Figma component pages

Created through direct Figma MCP using `component-to-figma`:

- [LineItem review page](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3901-173), page `3898:2`, set `3900:594`, eight layout/readOnly/pending variants.
- [TotalsSummary review page](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3902-34), page `3898:3`, set `3899:92`, two pending variants. Private row set `3899:25` represents supplied data, not another React component API.

Both pages carry red review markers. Existing pages, component masters, variable values and modes were preserved. Nested PriceBlock, QuantityField, Button, AvailabilityStatus and StatusText are instances. QuantityField instances clear their inherited forced Light mode. Local button paint overrides avoid stale remote bindings inside these new components.

LineItem examples: editable, read-only, compact, pending, unavailable, item error, long product title and custom composition with extra actions. TotalsSummary examples: partial, complete, discounted, pending and custom rows. The cart composition story demonstrates reuse; it does not define another shared component.

## Token binding

Bind component token aliases to existing semantic variables. Preserve the two-layer chain in each component stylesheet. Gap variables use the current Figma conventions and skill workflow. New LineItem image dimensions, title/detail typography and spacing come from existing scale tokens. TotalsSummary content/muted/discount foregrounds, divider, total weight and row/section spacing alias existing tokens. Supporting text uses the primary foreground for readable light/dark defaults; size provides its hierarchy. The existing secondary foreground has insufficient dark-mode contrast and is unchanged.

Source of truth:

- `src/tokens/components/organisms/_line-item.css`
- `src/tokens/components/molecules/_totals-summary.css`
- `src/organisms/line-item.tsx`
- `src/molecules/totals-summary.tsx`

New `line-item` and `totals-summary` collections contain aliases, including reference-to-derived chains. Two missing computed success foreground primitives live in a new `core` collection and are aliased by `semantic/color/success/fg` in Light/Dark. Preview panels switch this semantic collection together with the existing Theme. No existing token collections were reorganized. Figma uses the existing library Inter font; browser system-ui can wrap differently. Fluid image/title/quantity dimensions use 96/120/240 px design references while code retains its clamp expressions.

## Verification and Code Connect

Full review sheets were visually inspected against Storybook. Row notes grow their containers, pending feedback does not overlap, and review sections have no overlap or horizontal overflow. The custom composition moves price below options and supplies an additional outlined action. The item error follows controls. These two composition presets are private static documentation components; the public configurable set remains LineItem.

Local parserless templates are `src/organisms/line-item.figma.ts` and `src/molecules/totals-summary.figma.ts`. `pnpm --dir libs/ui figma:connect:parse` passed with both templates included. This validates parsing, not live template execution in Figma. TotalsSummary converts configurable row helpers to the `rows` data prop; footer/actions remain slots. LineItem maps its root variants and composition slots to the public compound API.

Figma rejected both registration attempts: "Published component not found. Please make sure component/component set is published before mapping." Code Connect remains unregistered. Publish the component sets to the Figma team library, then register the templates. Library publication is independent of a GitHub merge. Nested dependency mappings must also be available for their slot snippets to resolve fully.
