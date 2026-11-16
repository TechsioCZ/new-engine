<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/treeview--2774-36801.md (+ treeview-label, -tree, -branch, -branchcontrol, -branchtrigger, -branchtext, -branchindicator, -branchcontent, -item, -itemtext, -nodeicon, -indentguide), edited. Storybook: Molecules/TreeView → UX guidelines. -->

# TreeView: UX guidelines

TreeView lets the user explore a real data hierarchy and, where the mode
allows, select a node. Expanding a branch, moving focus and selecting a node
are three separate things and never merge.

## When to use

- Exploring or picking items in a hierarchy with keyboard tree semantics:
  folders, organisation structure, admin category trees, document archives.

## Use something else when

| Need | Use instead |
| --- | --- |
| Navigation between pages | `VerticalNavigation` |
| A compact hierarchical form value | `CascadeSelect` |
| A flat list | `Table` or a list |

## Anatomy

- **Label** (`TreeView.Label`): names the hierarchy being explored; it
  doesn't replace node names.
- **Tree** (`TreeView.Tree`): the nodes of one hierarchy.
- **Branch** (`TreeView.Branch`): a node with children —
  **BranchControl** (the row), **BranchText** (its name),
  **BranchIndicator** + **BranchTrigger** (open or close only this branch),
  **BranchContent** (its children).
- **Item** (`TreeView.Item`) with **ItemText**: a leaf node.
- **NodeIcon** (`TreeView.NodeIcon`): leaf, closed or open branch; it
  supplements the name.
- **IndentGuide** (`TreeView.IndentGuide`): decorative line; hierarchy must
  also read from names and indentation.

`TreeView.Node` renders all of this from the collection by default.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. |
| `state=selected` | `selectedValue` / `defaultSelectedValue` | The confirmed node. Hover or focus never selects. |
| `state=disabled` | `disabled` on the node data | The node and, for a branch, its whole subtree can't be selected or focused. |
| branch indicator `state=open` / `closed` | `expandedValue` / `defaultExpandedValue` | Disclosure only; says nothing about selection. |
| node icon `leaf` / `branch-closed` / `branch-open` | `TreeView.NodeIcon` (`showNodeIcons`) | Node type; never the only cue. |
| IndentGuide | `TreeView.IndentGuide` (`showIndentGuides`) | Decorative. |
| — | `selectionBehavior="all" \| "leaf-only" \| "custom"` | Which nodes can be selected. `leaf-only` for pickers where branches only expand. |

## Behaviour

**May:** expand or collapse a branch; select an allowed node; keep the
context of same-named nodes in different paths.

**Must not:** confuse focus, expansion and selection; act as page navigation
when the task is choosing data; move, change or delete data by opening a
branch.

- Opening a branch changes only what is visible. Focus marks where the user
  is browsing; selection decides the node's identity. Follow-up actions use
  the selected node and its path.
- Collapsing a branch never leaves focus inside hidden children; it moves to
  the visible ancestor.
- Loading children that fails or comes back empty never creates or keeps a
  selection of a node that doesn't exist. Show the failure in the branch and
  let the user retry.
- A node that can't be selected (`leaf-only`, `selectable: false`) is not
  disabled: it still expands and takes focus.

## Content and copy

- Node labels are the real names of the objects, kept short: `Brno warehouse`, `Invoices 2024` — cs: `Sklad Brno`, `Faktury 2024`.
- Same-named nodes in different branches need path context in the label or a
  description (`Brno warehouse — Alfa s.r.o.`).
- Actions on nodes follow [Menu](../../menu-usage/references/ux.md) rules.

## Accessibility

- The kit provides the `tree` / `treeitem` roles, roving focus, arrow keys,
  typeahead, `aria-expanded` and `aria-selected`.
- Always render `TreeView.Label` (or an associated accessible name).
- Selected, focused and open look different, and not by colour alone
  (selected rows keep a filled surface and underline).
- The expand indicator has its own target of at least 24 px.

## Edge cases

- **Two "Brno" warehouses under different companies**: the path or a
  description tells them apart.
- **Document tree without guides**: the hierarchy still reads from
  indentation and names.
- **Opening an archive folder**: expansion never moves or deletes documents
  inside it.

## Related

- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): browsing vs choosing.
- [VerticalNavigation](../../vertical-navigation-usage/references/ux.md): navigation trees.
- [CascadeSelect](../../cascade-select-usage/references/ux.md): hierarchical form values.
