# Zag-Powered Patterns

Use this reference when the component has interactive state that is better expressed as a machine than as local ad hoc state.

## When To Reach For Zag

Reach for Zag when the component has one or more of these traits:

- keyboard navigation or focus management
- popup or layered positioning behavior
- selection state
- disclosure, tabs, menu, combobox, dialog, tooltip, or similar machine-driven interaction
- accessibility semantics that should stay aligned with a known widget pattern

## Default Source Order

Inspect sources in this order:

1. the closest existing `libs/ui` Zag-based component
2. `~/.local/share/zagjs` if available
3. the official Zag docs as fallback

Do not copy blindly from docs. Adapt the established repo pattern first.

## Repo Pattern

The common shape in this repo is:

1. build the machine with `useMachine(...)`
2. derive the API with `connect(...)`
3. share the API through context when subcomponents need it
4. style state with data attributes and token classes
5. compose with existing library atoms where appropriate

## Audit Notes

- Runtime variables such as `--reference-width` or `--available-height` can be legitimate.
- Do not "clean up" those values away just because they are not defined in component token CSS.
- When a control needs hidden native form participation, keep it because the widget API requires it.
