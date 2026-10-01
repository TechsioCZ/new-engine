# PriceBlock and AvailabilityStatus Figma handoff

PR06 adds two independent storefront molecules. Figma component creation and
Code Connect are intentionally deferred until the public contracts have been
reviewed in downstream ProductCard adoption. No Figma tools are run as part of
this implementation.

## PriceBlock

- States: `known`, `from`, `discounted`, `on-request`, `pending`.
- Text properties follow the code props: `amountLabel`, `originalLabel`,
  `taxLabel`, `unitLabel`, `prefix`, `discountLabel`, `label`, `detail`, and
  `pendingLabel` only in their valid state branches.
- Discounted original price is semantic deleted content; an optional discount
  label composes the existing Badge.
- Tax and unit labels remain separate properties. The separator belongs to the
  component and appears only when both exist.
- Component variables mirror `price-block` CSS tokens and alias semantic or
  primitive variables rather than introducing raw values.

## AvailabilityStatus

- Statuses: `available`, `limited`, `preorder`, `unavailable`, `unknown`,
  `pending`.
- Settled properties: `label`, optional `detail`, optional icon override, and
  icon visibility. Pending exposes only `pendingLabel`.
- Every settled status has a distinct decorative default icon. The label, not
  color or the glyph alone, communicates meaning.
- Unknown stays separate from unavailable in variants, tokens and examples.
- Component variables mirror `availability-status` CSS tokens and preserve the
  primitive/semantic to component alias chain.

## Follow-up

Run the `component-to-figma` workflow after ProductCard integration confirms
the anatomy. Add Code Connect only after real Figma nodes exist; do not invent
node URLs or placeholder mappings in this PR.
