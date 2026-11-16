<!-- Source: TechsioCZ/UX_docs@167b618f1 (UX_Description_var_02_Simplified), edited. Storybook: UX/Introduction. -->

# UX guidelines

These pages say how screens built from `@techsio/ui-kit` should behave, read
and recover from problems. Component docs say how to call a component; these
pages say what the result must feel like, so every app built on the kit stays
consistent.

The same Markdown files are the source for Storybook and for the AI agent
skills (the `ux-guidelines` skill and every `<component>-usage` skill). Edit
them in `libs/ui/skills/`, never in the generated plugin bundle.

## Three levels of rules

| Level | Owns | Where it lives |
| --- | --- | --- |
| 1 — Corporate | Company-wide principles (tone, legal, accessibility commitment) | outside the kit |
| 2 — House rules | Action hierarchy (one primary per surface), danger and warning use, label tone, where actions and feedback live, formatting | the `UX/` pages: [Writing](ux-writing.md), [Formatting](formatting.md), [States](states.md), [Feedback and actions](feedback-and-actions.md), [Component selection](component-selection.md), [Value lifecycle](value-lifecycle.md), [Accessibility](accessibility.md) |
| 3 — Components | When to use one component, its variants and states, its behaviour, copy and accessibility | the **UX guidelines** page next to each component's stories |

A brand theme may tighten level 2 (for example its own label tone), but it
never changes a component's meaning or accessibility.

## Which rule wins

1. **The component API.** Props, values and behaviour that exist in code are
   the truth. A UX page never asks for a prop or value the component doesn't
   have.
2. **House rules (level 2).** When a component page and a `UX/` page seem to
   disagree, the `UX/` page wins and the component page is fixed.
3. **Component pages (level 3).** They apply the house rules to one component
   and add what only that component needs.

## Figma names vs code props

The design file names its variant axes differently from the code. Every
component page has a **Variants and states** table that maps them. The common
cases:

| Figma | Code |
| --- | --- |
| `state=hover`, `state=focus`, `state=active` | not props; the browser and the kit's data attributes produce them |
| `state=disabled` | `disabled` |
| `state=readonly` | `readOnly` |
| `state=loading` | `isLoading` (Button), `loading` (DataTable) |
| `state=error`, `success`, `warning` | `validateStatus` on form fields and bare inputs |

## How a component page is organised

Every component's UX guidelines page uses the same sections, and leaves out
the ones with nothing to say:

- **When to use** and **Use something else when**: the decision.
- **Anatomy**: the parts and who owns what.
- **Variants and states**: Figma → code, and what each option means.
- **Behaviour**: what it may and may not trigger, and how values move from
  draft to confirmed ([Value lifecycle](value-lifecycle.md)).
- **Content and copy**: labels and messages, with English and Czech examples.
- **Accessibility**: what the kit already handles and what the app must add.
- **Edge cases**: the failures and races worth designing for.
- **Related**: the `UX/` pages it applies.

## Where the content came from

The first version was edited down from the Figma-generated UX descriptions in
[TechsioCZ/UX_docs](https://github.com/TechsioCZ/UX_docs) (variant
`UX_Description_var_02_Simplified`, commit `167b618f1`). Repeated template
text was dropped, rules already covered here were merged, and points that
contradicted the code were left out and raised as questions in that
repository's issues. Each page records the source file it came from in a
comment at the top.
