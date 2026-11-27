<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Molecules/SectionCard → UX guidelines. -->

# SectionCard: UX guidelines

Use SectionCard for one titled block of a page. It is the one outlined surface level: inside another SectionCard or a SidePanel it drops its outline and padding.

## When to use

- A group of related fields or details on a detail or settings page.
- A block with its own local actions (Edit, Add).
- A Table that draws its own edges (`flush`).

## Use something else when

| Need | Use instead |
| --- | --- |
| The page title and page actions | PageHeader |
| A tinted tile, note or list item inside a card | an element with the `surface-tile` class |
| A DataTable | DataTable on its own; it has its own frame |

## Anatomy

- **Title** (`title`): the section's `h2`.
- **Description** (`description`): one sentence under the title.
- **Actions** (`actions`): local to this section, top-right.
- **Body** (`children`).

## Behaviour

**Do:**

- Give every card a title unless it is the only block on the page.
- Use `flush` when the child draws its own edges.
- Nest cards freely; the inner ones lose their frame automatically.

**Don't:**

- Wrap a DataTable in a SectionCard.
- Add borders or shadows through className; the surface tokens own them.
- Use SectionCard as a clickable card.

## Content and copy

- Title: a noun in sentence case (`Billing`, `Latest invoices`).

## Accessibility

- The root is a `section`; its title is an `h2` under the page's `h1`.
