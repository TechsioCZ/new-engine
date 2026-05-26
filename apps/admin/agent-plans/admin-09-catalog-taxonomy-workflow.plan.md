---
name: Admin 09 - Catalog Taxonomy Workflow Parity
overview: Add default-admin parity for catalog taxonomy routes that sit beside products: categories, collections, category ranking, category product assignment, metadata, and project category description widgets.
todos:
  - id: catalog-source-map
    content: "Map default Medusa category and collection route trees, data hooks, forms, and project widgets against the deployed default admin."
    status: completed
  - id: category-list-detail
    content: "Implement category list and detail read parity including search, active/public status, products table, organize sidebar, metadata, and JSON."
    status: completed
  - id: category-editing
    content: "Implement category create, edit, ranking/organize, product assignment, and metadata edit only after request contracts are confirmed."
    status: pending
  - id: category-description-widget
    content: "Port the project category description editor mounted at product_category.details.before, preserving top/bottom description metadata keys and rich HTML editor behavior."
    status: pending
  - id: collection-parity
    content: "Implement collection list/detail/create/edit/product assignment/metadata parity as a parallel catalog slice after category read parity is stable."
    status: pending
isProject: false
---

# Admin 09 - Catalog Taxonomy Workflow Parity

## Execution Notes

Live default-admin validation on the deployed test backend showed that `/app/categories` is a top-level catalog workflow, not a small product detail detail:

- Category list columns: name, handle, status, visibility, row actions, search, create, edit ranking.
- Category row actions: edit, manage translations, delete.
- Category create modal: details step, organize/ranking step, title, handle, description, status, visibility.
- Category detail: products table with filters, organize/path/children sidebar, metadata, JSON.
- Category organize/ranking: tree-style hierarchy editing in a focus modal.
- Project widget: `apps/medusa-be/src/admin/widgets/category-description-editor.tsx` mounts before the category detail and edits `top_description_html` and `bottom_description_html` metadata using the rich HTML editor.

The local Medusa route map confirms category subroutes: `/categories/create`, `/categories/organize`, `/categories/:id/edit`, `/categories/:id/products`, `/categories/:id/organize`, and `/categories/:id/metadata/edit`.

Collections are adjacent in the default nav and have the same review shape: list, create, detail, edit, products, and metadata. Keep them in this lane but do not block category read parity on collection mutations.

## Constraints

- Do not fold category/collection work into product detail PRs.
- Do not delete or reorder live deployed categories during smoke tests.
- Do not implement category delete until confirmation UX and test-data safety are explicit.
- Preserve project metadata keys and query invalidation behavior for category description editing.

## Operator Guidance

Use the local Medusa dashboard category and collection routes as source references, and use `apps/medusa-be/src/admin/widgets/category-description-editor.tsx` for the project-specific widget contract.

## Branch Guidance

Recommended stacked branches:

- Category list/detail/read parity: `feat/admin-catalog-categories`, target `feat/admin`.
- Category description widget: `feat/admin-category-description-widget`, target `feat/admin-catalog-categories`.
- Category mutations and ranking: `feat/admin-category-mutations`, target `feat/admin-catalog-categories`.
- Collection parity: `feat/admin-catalog-collections`, target `feat/admin`.
