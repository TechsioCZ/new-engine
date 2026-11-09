<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/header--2774-38878.md, edited. Storybook: Organisms/Header → UX guidelines. -->

# Header: UX guidelines

Header is the top bar shared by every page: product identity, the main
navigation and a few common tools (search, account, cart). It is not a
catalogue of every feature.

## When to use

- The global top bar of a storefront or app: logo, primary navigation,
  search, account, cart.

## Use something else when

| Need | Use instead |
| --- | --- |
| Deep, hierarchical app navigation | `Sidebar` + `VerticalNavigation` |
| A page's own title and actions | the page header inside the content |
| Closing information and secondary links | `Footer` |

## Anatomy

- **Desktop** (`Header.Desktop`) and **Mobile** (`Header.Mobile`) regions;
  `Header.Hamburger` opens and closes the mobile region.
- **Container** (`Header.Container`, `position` start / center / end): groups
  the logo, navigation and actions.
- **Nav** (`Header.Nav`) with **NavItems** (`Header.NavItem`): the main
  destinations, each a real `Link` with a clear target.
- **Actions** (`Header.Actions`, `Header.ActionItem`): common tools such as
  search, account and cart.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. Not a breakpoint: the app decides where navigation collapses. |
| — | `direction="horizontal" \| "vertical"` | Main axis. Not in Figma. |
| — | `Header.NavItem active` | The current section. Also set `aria-current="page"` on its link. |
| — | `Header.Mobile position="left" \| "right"` | Side the mobile menu aligns to. |

## Behaviour

**May:** open named main destinations and common tools; keep navigation and
essential actions reachable when space runs out.

**Must not:** list every feature in one row; treat a Figma frame width as a
tested breakpoint.

- Keep the same order on every page: logo first, then navigation, search,
  account and cart last.
- When the layout narrows, navigation moves behind the hamburger; it is never
  simply cut off. Priority actions (search, cart) stay visible as long as
  possible.
- The page that is actually shown decides the active item. Opening the mobile
  menu is not navigation.
- Switching section or agenda never pretends to save an unfinished document;
  the page's leave-guard decides.

## Content and copy

- Navigation labels are short nouns: `Products`, `Orders` — cs: `Produkty`,
  `Objednávky`.
- Icon tools carry a name that includes state: `Cart, 3 items`, `Account` —
  cs: `Košík, 3 položky`, `Účet`.
- In internal tools, name the current project or workspace in text; brand
  colour alone doesn't tell the user where they are.

## Accessibility

- The kit renders a `header` landmark and a `nav` for `Header.Nav`. The
  hamburger has `aria-expanded` and `aria-controls`; Escape closes the menu
  and returns focus to it.
- `Header.Hamburger` defaults to the English label `Toggle mobile menu`; pass
  a localised `aria-label` — cs: `Menu`.
- `active` is visual only; the current link also needs
  `aria-current="page"`.
- A sticky header never covers focused content (use `scroll-padding-top`).

## Edge cases

- **Narrow screen on a public site**: navigation is always reachable through
  the hamburger; there is never a width where it is gone and no control opens
  it.
- **Switching agenda in an ERP with an unsaved document**: the switch is
  navigation, not a save. Warn or keep the draft.
- **Several workspaces**: show the workspace name in text in the header.

## Related

- [Component selection](../../ux-guidelines/references/component-selection.md): Header vs Sidebar.
- [Sidebar](../../sidebar-usage/references/ux.md): app navigation.
- [Footer](../../footer-usage/references/ux.md): closing information.
