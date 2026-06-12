---
name: tree-view-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit TreeView for
  hierarchical data with Zag.js tree-view behavior, node collection, branch and
  item parts, selection behavior, icons, indentation, expansion, selection, and
  keyboard/typeahead support.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/tree-view.tsx"
  - "libs/ui/src/tokens/components/molecules/_tree-view.css"
  - "libs/ui/stories/molecules/tree-view.stories.tsx"
  - "libs/ui/src/molecules/figma/tree-view.figma.tsx"
  - "https://zagjs.com/components/react/tree-view"
---

# @techsio/ui-kit TreeView Usage

Use TreeView for hierarchical navigation or selection. Do not flatten trees
into custom nested lists when keyboard navigation/selection matters.

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
