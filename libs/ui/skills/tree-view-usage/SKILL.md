---
name: tree-view-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit TreeView for
  hierarchical data with Zag.js tree-view behavior, node collection, branch and
  item parts, selection behavior, icons, indentation, expansion, selection, and
  keyboard/typeahead support.
metadata:
  component_version: "1.1.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/tree-view.tsx"
  - "libs/ui/src/tokens/components/molecules/_tree-view.css"
  - "libs/ui/stories/molecules/tree-view.stories.tsx"
  - "libs/ui/src/molecules/tree-view.figma.ts"
  - "https://zagjs.com/components/react/tree-view"
---

# @techsio/ui-kit TreeView Usage

Use TreeView for hierarchical navigation or selection. Do not flatten trees
into custom nested lists when keyboard navigation/selection matters.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `TreeView`.

**Use it when**

- Selecting or managing items in a hierarchy with keyboard tree semantics: folders, category trees in admin, file browsers.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Site/category navigation links | VerticalNavigation |
| A hierarchical form value | CascadeSelect |
| Flat lists | Table / list |

**Do**

- Show counts or state per node where helpful; keep labels short.
- Persist expanded state across navigation.
- Offer search/filter for large trees.

**Don't**

- Put complex forms inside nodes.
- Nest deeper than ~5 levels without breadcrumbs or search.

**Copy and states**

- Node labels are names; actions on nodes follow Menu rules.

## Setup

```tsx
<TreeView data={nodes} selectionMode="single" defaultExpandedValue={["catalog"]}>
  <TreeView.Label>Catalog</TreeView.Label>
  <TreeView.Tree>
    {nodes.map((node, index) => <TreeView.Node key={node.id} node={node} indexPath={[index]} />)}
  </TreeView.Tree>
</TreeView>
```

Supported root props:

```text
data: TreeNode[]
selectionBehavior: all | leaf-only | custom
selectionMode: single | multiple
expandedValue/defaultExpandedValue, selectedValue/defaultSelectedValue
focusedValue, expandOnClick, typeahead
onExpandedChange, onSelectionChange, onFocusChange
size: sm | md | lg
```

## Core Patterns

### Use TreeView.Node for default rendering

The default node component composes branch/item parts, icons, indent guides,
hover handlers, branch indicators, and recursive children.

### Choose selectionBehavior deliberately

Use `leaf-only` for file/category pickers where branches only expand. Use
`custom` when some nodes carry `selectable: false`.

### Keep data IDs stable

`id` drives Zag node value. Do not use array index as node id.

## Common Mistakes

### HIGH Custom nested list tree

Wrong:

```tsx
<ul>{nodes.map((n) => <li onClick={() => select(n)}>{n.name}</li>)}</ul>
```

Correct:

```tsx
<TreeView data={nodes}><TreeView.Tree>{nodes.map((n, i) => <TreeView.Node node={n} indexPath={[i]} />)}</TreeView.Tree></TreeView>
```

Source: libs/ui/src/molecules/tree-view.tsx

### HIGH Index as id

Wrong:

```tsx
{ id: String(index), name: category.name }
```

Correct:

```tsx
{ id: category.slug, name: category.name }
```

Source: https://zagjs.com/components/react/tree-view

### HIGH Inline tree node styling

Wrong:

```tsx
<TreeView.Item className="pl-4 hover:bg-gray-100" />
```

Correct:

```tsx
<TreeView.Node node={node} indexPath={indexPath} />
```

Source: libs/ui/src/tokens/components/molecules/_tree-view.css

## Validation Commands

```sh
rg -U -n "<ul[\\s\\S]{0,400}(children|nodes|tree)|<TreeView\\.Item[^>]*className=.*(pl-|bg-|hover:)" apps
rg -n "id: String\\(index\\)|id: index|selectionBehavior=\"(branches|leaves)\"" apps
rg -U -P -n "<TreeView(?![\\s\\S]{0,500}<TreeView\\.Tree)" apps
```

## Wave 2 contracts

TreeView splits all Zag machine props from DOM props using tree.splitProps. ids, defaultFocusedValue, getRootNode and machine callbacks configure the machine and are never serialized onto the root element. defaultFocusedValue determines the initial roving-tabindex node; custom ids address the actual tree parts. Canonical sizes are sm/md/lg (default md).

Custom tree examples must include TreeView.Label (or an explicitly associated accessible label). Use full-width, max-width bounded wrappers and stack comparison panels on narrow viewports; an activity log should wrap long node identifiers instead of widening the page.

## Selection and disclosure are independent

One central selection predicate applies to pointer, keyboard, range/select-all
and controlled/default selections: disabled nodes and all descendants of a
disabled branch cannot be selected or focused, even when controlled expansion
keeps them visible. Disabled state is inherited without mutating caller data, and a
newly disabled subtree recovers owned focus to an enabled visible node. Leaf-only
excludes branches; custom excludes selectable:false nodes. Nonselectability is
not disability: branches retain arrow/Enter/Space disclosure and normal roving
focus. Ctrl/Cmd+A selects only eligible nodes. Selected rows retain a filled
surface and underline after blur and on hover; their descendants are not filled.
Expansion indicators have a separate 24px-minimum hit target; the glyph remains
compact. Each recursively nested level adds one logical indent unit.

Collapse and data removal recover a hidden/removed focused descendant to its
visible ancestor or first enabled visible node. DOM focus only follows when
the tree owned it. Controlled focusedValue owners receive a correction request
and should accept it; an enabled visible keyboard entry is retained meanwhile.
Consumer handlers compose with machine handlers; preventDefault intentionally
cancels selection/navigation, while logging alone does not replace it.
