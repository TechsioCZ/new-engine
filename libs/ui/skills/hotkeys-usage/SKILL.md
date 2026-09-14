---
component_version: "1.0.0"
name: hotkeys-usage
description: >
  Use after component-usage-ux when an app needs shortcut hints or explicit-store
  Zag keyboard registrations with @techsio/ui-kit Hotkeys. Covers compound
  keycaps, current callbacks, store ownership, scopes and optional registry readback.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/hotkeys.ts"
  - "libs/ui/src/atoms/hotkeys.tsx"
  - "libs/ui/src/tokens/components/atoms/_hotkeys.css"
  - "libs/ui/stories/atoms/hotkeys.stories.tsx"
  - "libs/ui/test/hotkeys.spec.ts"
---

# @techsio/ui-kit Hotkeys Usage

Use Hotkeys for shortcut hints and the separate hooks for native Zag
registrations. A hint never installs a handler or requires a store.

## Shortcut presentation

```tsx
import { Hotkeys } from "@techsio/ui-kit/atoms/hotkeys"

<Hotkeys hotkey="mod+K" />

<Hotkeys.Root aria-label="Control plus K" role="group">
  <Hotkeys.Key>Ctrl</Hotkeys.Key>
  <Hotkeys.Separator />
  <Hotkeys.Key>K</Hotkeys.Key>
</Hotkeys.Root>
```

The automatic form renders one native Zag-formatted keycap; it does not split
formatted labels into another shortcut grammar. Explicit children take
precedence. Root, Key and Separator forward their native attributes and refs.
Separator defaults to a decorative plus sign. There are no size/theme variants.

`formatOptions` accepts native Zag formatter options such as
`{ platform: "mac" }`, `style`, `separator` and `sequenceSeparator`.
Automatic formatting uses a deterministic Windows server/hydration snapshot,
then lets Zag select the client platform. It does not guess keyboard layout.

## Register an application action

```tsx
import { useEffect, useState } from "react"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Hotkeys } from "@techsio/ui-kit/atoms/hotkeys"
import { createHotkeyStore, useHotkey } from "@techsio/ui-kit/hotkeys"

function SaveAction({ save, canSave }: {
  save: () => void
  canSave: boolean
}) {
  const [store] = useState(() => createHotkeyStore())

  useEffect(() => {
    store.init({ target: document })
    return () => store.destroy()
  }, [store])

  useHotkey({
    store,
    hotkey: "mod+S",
    action: save,
    enabled: canSave,
    options: {
      enableOnFormTags: false,
      preventDefault: true,
      requireReset: true,
    },
  })

  return (
    <Button disabled={!canSave} onClick={save}>
      Save <Hotkeys hotkey="mod+S" aria-hidden="true" />
    </Button>
  )
}
```

The store owner initializes and destroys its stable store. Registration hooks
only register/unregister their own ids; they never initialize or destroy it.
The owner must outlive all consumers. Do not call `destroy()` while consumers
remain mounted: native destruction also clears registrations and subscriptions.

`useHotkey` accepts native command fields plus a required store and an optional
id. `useHotkeys({ store, commands })` registers several native command
definitions with caller-supplied stable, store-wide unique ids. Treat definitions
as immutable React inputs; use current callback/boolean/function `enabled`
values without manually memoizing every inline array.

Keep `options.target` identity stable. Direct elements are passed through
unchanged; getter functions should be stable, for example
`const [getTarget] = useState(() => () => targetRef.current)`.
Changing a target getter replaces the native registration, even if the getter
returns the same element. This preserves Zag's identity-based conflict policy;
do not create a new inline getter every render alongside registry readback.

## Registry readback is optional metadata

```tsx
import { useHotkeyRegistrations } from "@techsio/ui-kit/hotkeys"

const registrations = useHotkeyRegistrations({ store })
```

Readback includes the store's registrations, not just this component's commands.
It is not a filtered permission system or an automatic source of available
palette actions. Scopes control keyboard matching, not whether an application
action is authorized. Apply availability to buttons, Command actions and
shortcuts consistently. Do not invoke registry actions using fabricated
KeyboardEvents; pass the same application callback to each real entrypoint.

For labels outside the visual atom, `useFormatHotkey()` returns a
hydration-safe formatter accepting the native hotkey string and format options.

## Native behavior boundaries

- Native modifiers, `>` sequences, scopes, command targets and options remain Zag
  behavior. Use a visible button as an alternative to a shortcut.
- Character-only shortcuts/sequences need a focus-scoped target or an explicit
  disable/remap policy. Ignoring inputs alone does not satisfy that requirement.
- Modifier shortcuts can match form controls by native default. Set
  `enableOnFormTags: false` explicitly when an application should opt out.
  Contenteditable behavior is separately controlled by
  `enableOnContentEditable`.
- `requireReset: true` is appropriate for toggles that must not repeat on a
  held key. It remains the native option, not an app-wide repeat arbiter.
- Use native `preventDefault: true` when the application owns a browser-reserved
  shortcut such as mod+K or mod+S. A displayed Hotkeys hint never prevents the
  browser action because it does not install a handler.
- In an embedded shell with its own shortcuts, use native
  `stopPropagation: true` when the application should own that event. The
  `Command/With Hotkey/Playground` uses it for mod+K to avoid Storybook search
  taking focus.
- `*` registrations match all scopes. Matching registrations at equal highest
  native priority can all execute; opening a Dialog grants no implicit priority.
- Physical keyboard layouts, IME and screen-reader behavior require real-device
  verification. Synthetic browser events are not proof of universal support.
- The pinned Zag 1.43.3 does not suppress matching modifier events merely
  because `KeyboardEvent.isComposing` is true. A synthetic browser regression
  records this upstream limitation; do not promise automatic IME suppression.

## Common mistakes

- Mounting one registration for each visible shortcut hint.
- Creating a store every render, or destroying a shared store in a leaf cleanup.
- Using array indices as changing command ids or reusing another owner's id.
- Treating scopes or registry metadata as application permissions.
- Adding a custom parser, matcher, keyboard provider or second command registry.
- Placing a sequence expression in `aria-keyshortcuts`; that ARIA attribute is
  metadata for actual supported key combinations, not a binding or sequence API.

## Validation

```sh
pnpm.cmd -C libs/ui build:storybook
pnpm.cmd -C libs/ui test:components hotkeys.spec.ts --project=desktop
pnpm.cmd -C libs/ui check:package
pnpm.cmd -C libs/ui validate:tokens
```

The browser runner uses the existing Docker harness. Run narrow specs and
inspect feature screenshots; do not regenerate unrelated visual baselines.
Public examples cover Playground, Platforms, Compound, FormFields and
FocusedSequence. FormFields saves a visible note from the input or button;
FocusedSequence opens a named Help section when the outlined demo area is
focused and receives the `g > h` sequence.
Technical form-field, scope and lifecycle fixtures retain direct story ids and
test coverage, but use `!dev` and `!autodocs` to stay out of the sidebar and
docs.
The default production build skips only the development StrictMode replay test,
based on its compiled mode marker, never on the observed effect count. Run that
test against a development React build to verify the owner actually sets up
twice and its registrations/subscriptions survive:

```sh
pnpm.cmd -C libs/ui exec cross-env NODE_ENV=development storybook build
pnpm.cmd -C libs/ui test:components hotkeys.spec.ts --project=desktop --grep "development StrictMode"
```
