<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/accordion--2774-26595.md and accordionitem, accordionheader, accordiontitle, accordionsubtitle, accordionindicator, accordion-indicator-icon, accordioncontent docs, edited. Storybook: Molecules/Accordion → UX guidelines. -->

# Accordion: UX guidelines

Accordion stacks named sections that the user opens only when needed. Opening
or closing a section only changes what is visible; it never saves, confirms or
navigates.

## When to use

- Optional or secondary content the user may want to read: FAQs, shipping and
  return details, advanced settings.
- Long pages where users scan section titles and open only what they need.

## Use something else when

| Need | Use instead |
| --- | --- |
| Peer views of the same object the user switches between | `Tabs` |
| Ordered stages that must be completed in sequence | `Steps` |
| Navigation links in a tree | `VerticalNavigation` |
| Content everyone must read before acting (price, consent terms, errors) | keep it visible, no disclosure |
| Text that should take the user to another page | `Link` |

## Anatomy

- **Item** (`Accordion.Item`): one section; it ties its own header,
  indicator and content together.
- **Header** (`Accordion.Header`): the trigger button, rendered as a heading.
  It holds:
  - **Title** (`Accordion.Title`): names the whole section. It stays the main
    name even when a subtitle is present.
  - **Subtitle** (`Accordion.Subtitle`, optional): one short context line.
    The section must still be identifiable without it.
  - **Indicator** (`Accordion.Indicator`): the chevron. It shows the real open
    state and is not a second control; the header does the activation.
- **Content** (`Accordion.Content`): the section's own information and any
  named controls for it. Interactive controls go here, never inside the
  header button.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `variant=default` / `borderless` / `child` | `appearance="outline" \| "plain"`, plus `nested` for `child` | Visual treatment only. `nested` inherits the surrounding surface; it is not a licence to nest accordions. |
| `shadow=none` / `sm` / `md` | `shadow="none" \| "sm" \| "md"` | Separation from the page; no change in meaning. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. `sm` never shrinks the trigger below a usable target. |
| `state=collapsed` / `expanded` | `value` / `defaultValue` (array of item values) | The header, indicator and visible content always agree. |
| `state=disabled` | `disabled` on the root or on `Accordion.Item` | The section can't be opened now, for a reason the user can find. |
| — | `multiple`, `collapsible` | How many sections may be open, and whether the last open one can close. Chosen from the content model, not from Figma. |

## Behaviour

**May:** open and close one named section; offer separately named controls
inside an open section.

**Must not:** save, submit, confirm consent or navigate just because a
section opened or closed; hide the only instruction needed to finish the main
task.

- Activating a header changes only its own section; indicator and content
  update together.
- Collapsing a section with a form inside never silently saves or discards
  the draft. Keep the values, and if a collapsed section holds a validation
  error, open it on submit and focus the field
  ([States](../../ux-guidelines/references/states.md)).
- After a section closes, no focus is left stranded inside hidden content.

## Content and copy

- Titles are short noun phrases or questions that predict the content:
  `Shipping and returns`, `Can I change my order?` — cs: `Doprava a vrácení`,
  `Rozpis nákladů`.
- A subtitle adds one line of context (`3 items`, `Last edited today`). Long
  explanations belong in Content, not in an oversized subtitle.
- Replace sample section texts with the real object names of the product.

## Accessibility

- The kit handles keyboard activation, `aria-expanded` and the link between a
  header and its panel. `Accordion.Header` renders an `h3`; set `aria-level`
  to fit the page outline.
- The title alone names the section for a screen reader; the indicator adds
  no extra tab stop.
- Long titles, longer translations and RTL keep the title and indicator
  readable; the title wraps instead of pushing the indicator out.

## Edge cases

- **Collapsing a cost breakdown being edited**: the typed values stay; the
  section doesn't throw them away without warning.
- **Consent on a product page**: information that decides the consent being
  given must not live only in a closed section.
- **Long subtitle**: it wraps or truncates without covering the title or the
  indicator.

## Related

- [States](../../ux-guidelines/references/states.md): errors inside collapsed sections.
- [Component selection](../../ux-guidelines/references/component-selection.md): Accordion vs Tabs vs Steps.
- [Tabs](../../tabs-usage/references/ux.md): switching peer views.
