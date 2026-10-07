# PR10 cart presentation: Figma handoff

LineItem and TotalsSummary implement audit C01/C02. Both are presentational; application formatting, shipping selection, inventory, totals and mutations remain application-owned.

## Component ownership

- LineItem is a compound organism. Root shares title, layout, pending and readOnly. Image, Body, Heading, Title, Price, Options and Controls arrange application-provided content. Quantity requires readOnlyLabel and replaces editable children with text in readOnly. Actions omits mutation controls in readOnly and blocks them while pending. Remove uses a localized label containing the root product name, is omitted in readOnly and disabled while pending. Root pending feedback is automatic. AvailabilityStatus and StatusText can be inserted directly; image, price and actions can be omitted or rearranged.
- TotalsSummary is a molecule. It renders supplied label/value rows and notes in a definition list, a separately labeled total, optional footer and actions. Pending preserves the supplied values and blocks actions. An unresolved fee must be supplied as text such as `Choose delivery`, not assumed to be zero.

## Figma follow-up

Use `component-to-figma` after API review and stabilization. Create only the two component pages with red review markers. Check existing Button, QuantityField and PriceBlock composition and keep light/dark modes consistent. Do not change other components or generate new brand themes.

LineItem examples: editable, read-only, compact, pending, unavailable, item error, long product title and custom composition with extra actions. TotalsSummary examples: partial, complete, discounted, pending and custom rows. The cart composition story demonstrates reuse; it does not define another shared component.

## Token binding

Bind component token aliases to existing semantic variables. Preserve the two-layer chain in each component stylesheet. Gap variables use the current Figma conventions and skill workflow. New LineItem image dimensions, title/detail typography and spacing come from existing scale tokens. TotalsSummary content/muted/discount foregrounds, divider, total weight and row/section spacing alias existing tokens. Supporting text uses the primary foreground for readable light/dark defaults; size provides its hierarchy. The existing secondary foreground has insufficient dark-mode contrast and is unchanged.

Source of truth:

- `src/tokens/components/organisms/_line-item.css`
- `src/tokens/components/molecules/_totals-summary.css`
- `src/organisms/line-item.tsx`
- `src/molecules/totals-summary.tsx`

No Figma nodes or Code Connect registration are claimed in this change. Mapping follows component publication in the Figma library, independently of a GitHub merge.
