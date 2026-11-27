<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Organisms/PageHeader → UX guidelines. -->

# PageHeader: UX guidelines

Use PageHeader once per page, at the top of the content column. It owns the page's only `h1`.

## When to use

- Every list, detail, settings or dashboard page.
- A record page: the record's name as the title, its status as `meta`, a back link as `breadcrumb`.

## Use something else when

| Need | Use instead |
| --- | --- |
| A titled block inside the page | SectionCard |
| The heading of a dialog or panel | Dialog / SidePanel `title` |
| Site-wide navigation | Header, Sidebar, VerticalNavigation |

## Anatomy

- **Breadcrumb** (`breadcrumb`): a `BreadcrumbTemplate` or a back link, above the title.
- **Title** (`title`): the page's `h1`.
- **Meta** (`meta`): badges beside the title.
- **Description** (`description`): one quiet sentence, capped at a readable line length.
- **Actions** (`actions`): right-aligned, wrapping below the title on narrow screens.

## Behaviour

**Do:**

- Put the primary page action last in `actions`; secondary actions before it.
- Keep the description to one sentence about what the page is for.
- Use `meta` for status badges of the record the page shows.

**Don't:**

- Render more than one PageHeader (or `h1`) per page.
- Put form-local actions (Save) in the header; they belong to the form footer.
- Put filters or tabs in `actions`.

## Content and copy

- Title: the page or record name in sentence case, no trailing punctuation (`Orders`, `Order 2026-0142`).

## Accessibility

- The title is the page's only `h1`; SectionCard titles are `h2`.
- The root is a `header` landmark inside the page content.
