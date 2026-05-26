---
name: Admin 05 - Products Workflow Parity
overview: Turn the product list/detail into a useful product management surface with carefully staged edit capabilities.
todos:
  - id: product-source-map
    content: "Map default Medusa product list/detail/create/edit routes, forms, fields, and mutation endpoints."
    status: completed
  - id: detail-completeness
    content: "Complete product detail read sections for variants, options, images, categories, sales channels, shipping profile, stock, metadata, and organization."
    status: in_progress
  - id: basic-edit
    content: "Add basic edit flows for title, subtitle, handle, status, description, organization, and metadata after contracts are confirmed."
    status: pending
  - id: complex-edit
    content: "Add variants, pricing, media, and inventory edits only after source mapping and validation rules are explicit."
    status: pending
isProject: false
---

# Admin 05 - Products Workflow Parity

## Execution Notes

Product editing has many linked entities. Keep early changes narrow and confirm Medusa request shapes before mutating.

This lane owns product list/detail/create/edit parity. Category, collection, ranking, and taxonomy workflows are owned by Admin 09 so product work does not become an oversized review branch.

## Constraints

- Do not build bespoke form primitives when `libs/ui` or existing admin patterns can be reused.
- Do not duplicate product metadata conventions across components.
- Do not add backend endpoints for core Medusa product mutations unless the Admin API cannot express the workflow.

## Operator Guidance

Use the local Medusa dashboard product forms to identify field grouping, validation, and mutation shape.

## Branch Guidance

Keep product detail/read work separate from taxonomy work:

- Product read/detail and basic product edit: `feat/admin-products-workflow`, target `feat/admin`.
- Variant/pricing/media/inventory edits: split into stacked PRs once product read parity is stable.
- Categories and collections: use Admin 09 branches, not this product branch.
