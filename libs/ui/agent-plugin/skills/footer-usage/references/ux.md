<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/footer--2774-38666.md (+ footertitle, footerlink, footertext, footerdivider), edited. Storybook: Organisms/Footer → UX guidelines. -->

# Footer: UX guidelines

Footer collects secondary navigation and closing information below the main
work: legal links, contact, company details. Nothing the user needs to finish
the current task lives only here.

## When to use

- The global site or app footer: secondary navigation, legal links, contact,
  newsletter, payment and shipping marks, version or owner details.

## Use something else when

| Need | Use instead |
| --- | --- |
| Primary navigation and priority actions | `Header` (or `Sidebar` in apps) |
| Actions for the current page | the page content or page header |
| An error or message the user must act on | next to the content it concerns (`StatusText`, `Toast`) |

## Anatomy

- **Root** (`Footer`): the `<footer>` landmark.
- **Container** (`Footer.Container`): lays out the groups.
- **Section** (`Footer.Section`): one group, with:
  - **Title** (`Footer.Title`): a heading that names the group. It is not a
    link.
  - **List** (`Footer.List`) of **Links** (`Footer.Link`): each names its
    real destination.
  - **Text** (`Footer.Text`): closing information supplied by the product
    owner (address, ID numbers, copyright).
- **Divider** (`Footer.Divider`): separates groups that are actually present.
- **Bottom** (`Footer.Bottom`): the closing strip (copyright, legal links).

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density of the whole footer, passed to its parts. |
| — | `direction="horizontal" \| "vertical"` | Main axis of the root. Not in Figma. |
| — | `layout="col" \| "row"` | Groups as a responsive grid or a wrapping row. Not in Figma. |
| — | `sectionFlow="col" \| "row"` | Items inside a group stacked or inline. Not in Figma. |
| FooterTitle / FooterLink / FooterText / FooterDivider | `Footer.Title` / `Footer.Link` / `Footer.Text` / `Footer.Divider` | Same roles. Figma has no parts for `Container`, `Section`, `List` and `Bottom`. |

## Behaviour

**May:** open a named secondary destination; show current closing
information; group related links under a heading.

**Must not:** hold the only main action or the only critical message; change
data from a footer link; ship sample contacts or legal data as real ones.

- A link takes the user to what its name promised. An unavailable target
  explains itself and offers a way back.
- Render a divider only between groups that are present. An empty group
  leaves no lone line and no heading without content.

## Content and copy

- Group titles are short nouns: `Customer care`, `Company` — cs:
  `Zákaznický servis`, `O nás`.
- Link text names the destination: `Shipping and returns`, `Privacy policy`
  — cs: `Doprava a vrácení`, `Ochrana osobních údajů`.
- Contact, legal and version data come from the product owner. Generate the
  copyright year from the current date.

## Accessibility

- The root is a `footer` landmark; give it an `aria-label` when the page has
  more than one.
- `Footer.Title` renders an `h3`, and each `Footer.Section` is a `group`; link
  the section to its title with `aria-labelledby`.
- Icon-only links (social icons) need an `aria-label`.
- On narrow screens every group stays reachable; legal links are never
  hidden.

## Edge cases

- **Save error in a long work screen**: show it next to the form, never only
  in the footer below the overview.
- **Empty group on a public site**: drop the group with its heading and
  divider.
- **Version or owner in an internal portal**: read it from the running
  product, not from the design sample.

## Related

- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): where actions and messages live.
- [Header](../../header-usage/references/ux.md): primary navigation.
- [Link](../../link-usage/references/ux.md): link text.
