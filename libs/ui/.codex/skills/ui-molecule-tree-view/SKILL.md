---
name: ui-molecule-tree-view
description: Use when working with the @libs/ui TreeView molecule (src/molecules/tree-view.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# TreeView molecule
Use this skill to apply TreeView correctly in UI work.

## Source Of Truth
- Read `src/molecules/tree-view.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `TreeView`
- `TreeNode`

## Purpose
Zag tree-view with compound subcomponents and optional helper `TreeView.Node` for default rendering.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | No | `string` | - | - |
| `data` | Yes | `TreeNode[]` | - | - |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop. |
| `selectionBehavior` | No | `"all"  &#124;  "leaf-only"  &#124;  "custom"` | `all` | - |
| `dir` | No | `"ltr"  &#124;  "rtl"` | `ltr` | - |
| `selectionMode` | No | `"single"  &#124;  "multiple"` | `single` | - |
| `expandedValue` | No | `string[]` | - | Controlled expanded. |
| `selectedValue` | No | `string[]` | - | Controlled selected. |
| `focusedValue` | No | `string` | - | Controlled focused. |
| `defaultExpandedValue` | No | `string[]` | - | Uncontrolled expanded. |
| `defaultSelectedValue` | No | `string[]` | - | Uncontrolled selected. |
| `expandOnClick` | No | `boolean` | `true` | - |
| `typeahead` | No | `boolean` | `true` | - |
| `onExpandedChange` | No | `tree.Props["onExpandedChange"]` | - | - |
| `onSelectionChange` | No | `tree.Props["onSelectionChange"]` | - | - |
| `onFocusChange` | No | `tree.Props["onFocusChange"]` | - | - |
| `children` | No | `ReactNode` | - | - |
| `className` | No | `string` | - | - |

## Compound API
- `TreeView.Label`
- `TreeView.Tree`
- `TreeView.NodeProvider`
- `TreeView.Branch`
- `TreeView.BranchTrigger`
- `TreeView.BranchControl`
- `TreeView.BranchText`
- `TreeView.BranchIndicator`
- `TreeView.BranchContent`
- `TreeView.IndentGuide`
- `TreeView.Item`
- `TreeView.ItemText`
- `TreeView.NodeIcon`
- `TreeView.Node`

## Controlled State
Controlled via expandedValue/selectedValue/focusedValue; uncontrolled via defaultExpandedValue/defaultSelectedValue.

## Semantics And Accessibility
Zag tree-view props for root/tree/branch/item; uses aria-selected and data-disabled when appropriate.

## Usage Pattern
```tsx
<TreeView>
  <TreeView.Label>...</TreeView.Label>
  <TreeView.Tree>...</TreeView.Tree>
</TreeView>
```

## UI/UX Rules
- Use this component instead of raw HTML when an equivalent molecule exists.
- Keep labels, help text, and error feedback explicit; never rely on color alone.
- Prefer predictable defaults first, then opt into advanced props only when needed.
- Preserve keyboard and screen-reader behavior provided by the implementation.
- Keep visual consistency by using component variants and sizes before custom classes.

## Integration Checklist
- Verify required props first.
- Verify semantic structure in rendered markup.
- Verify focus, keyboard navigation, and disabled/read-only behavior.
- Verify controlled/uncontrolled mode is used consistently.
- Verify Storybook examples cover primary and stateful cases.
