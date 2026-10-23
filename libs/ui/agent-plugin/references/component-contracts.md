# Component contracts

These are the shared implementation and documentation requirements for
`@techsio/ui-kit`. Component-specific usage skills describe the public API;
this document defines what that API must mean. Existing compatibility props
are not removed merely to make a demo uniform.

## 1. Inline help and validation

- Render every below-control helper/validation message with `StatusText`, not
  a colored paragraph or a second hand-built icon/text row.
- `status="error" | "warning" | "success"` includes its state icon by default
  (`showIcon=true`). Do not pass `showIcon={false}` for field validation.
  `status="default"` is neutral helper text and deliberately has no default
  icon; an explicit `icon` may provide a decorative info icon.
- Icons are `aria-hidden="true"`. The sentence must name the problem/result
  without depending on its color or icon. Error copy includes a useful next step.
- Default `align="start"` keeps the icon centered in the first text line;
  subsequent lines remain in the text column, not under the icon. Use
  `align="center"` only for intentionally short single-line content.
- Match `size="sm" | "md" | "lg"` to the field. Icons inherit the message
  font size, with `h-status-text-icon-line` (`--height-status-text-icon-line:
  1lh`) providing the first-line frame; do not add pixel offsets.
- Give every message a stable, unique `id`. On the **focusable control**,
  merge existing caller-supplied IDs with its message IDs in `aria-describedby`.
  For errors, also set `aria-invalid=true` and `aria-errormessage` to the error
  message ID. Remove `aria-errormessage` when the error clears. Never leave
  dangling references to an unmounted message; do not replace the field's label.
- Simple fields can generate stable IDs with `useId`. Compound fields use
  `useDescribedBy()` on the root, `useRegisterDescription(id,
  registerDescription)` in the message part, and
  `joinDescribedBy(callerDescribedBy, describedById)` on the focusable part.
  The shared hook handles multiple mounted descriptions and cleanup; each
  rendered message still needs its own unique DOM ID.
- StatusText defaults to `role="alert"` for errors and `role="status"` for
  warning/success. Neutral help has no live role. Avoid repeated announcements:
  validate on blur/submit, not on every keystroke, and do not wrap the same
  message in another live region. `role`/ARIA overrides are available when a
  parent already owns announcements.

```tsx
<Label htmlFor={id}>Email address</Label>
<Input
  id={id}
  aria-describedby={joinDescribedBy(externalDescription, hintId, invalid ? errorId : undefined)}
  aria-invalid={invalid || undefined}
  aria-errormessage={invalid ? errorId : undefined}
/>
<StatusText id={hintId}>We only send updates about this order.</StatusText>
{invalid && <StatusText id={errorId} status="error">Enter a valid email address.</StatusText>}
```

In real code, include `errorId` in `aria-describedby` only while `invalid` is
true. A wrapper cannot infer an unrelated input's ID; association is a field
implementation responsibility, not something StatusText can do automatically.

## 2. Read-only is not disabled

**Every value-holding form control must support `readOnly: boolean`.** This
includes text/search/password/email inputs, Textarea, NumericInput,
QuantityField, Select, Combobox (including multiple), CascadeSelect, PhoneInput,
DatePicker, Checkbox/FormCheckbox, Switch, RadioGroup/RadioCard, Slider, Rating,
ColorSelect, FileUpload and editable/tag/chip value editors. Pure actions,
navigation, Menu commands and display-only components do not need this prop.
Propagate it through Form* wrappers and every controlled/uncontrolled path.

| Property | Read-only | Disabled |
| --- | --- | --- |
| Value | Visible; selectable/copyable when textual | Visible but unavailable |
| Tab order | Retain the normal focus target and visible focus ring | Remove all control/action tab stops |
| Editing | No input, clear, step, select, remove, drop, paste or keyboard mutation | No interaction |
| Appearance | Full-contrast text; subtle distinct surface | Disabled foreground/background/border |
| Cursor | `text` for text, `default` otherwise | `not-allowed` |
| Submission | Preserve the normal form value | Native disabled submission semantics |

### Required implementation

1. Native inputs/textarea receive `readOnly`; custom roles that support it receive
   `aria-readonly="true"`. Do not invent `aria-readonly` on unsupported roles
   such as button: expose a clear accessible read-only description there.
2. Put `data-readonly={readOnly ? "" : undefined}` on the value surface. Zag may
   supply this attribute; forward `readOnly` to its machine as well. Preserve
   `aria-disabled`/native `disabled` only for genuinely disabled controls.
3. `form-control-base` includes `form-control-readonly` and
   `form-control-disabled`. Controls that do not use the shared base must add
   `form-control-readonly` to their surface slot in `tv()`, or alias their
   component tokens to `--color-form-control-bg-readonly` and
   `--color-form-control-fg-readonly` and implement equivalent state selectors.
   The utilities recognize `[readonly]`, `[data-readonly]` and
   `[aria-readonly="true"]`; disabled takes priority. False-valued data
   attributes do not activate either utility. Do not spread a false native
   `disabled` attribute onto a custom element.
4. Read-only references are `--color-form-control-readonly` (surface) and
   `--color-form-control-text` (foreground); the derived public aliases are
   `--color-form-control-bg-readonly` and `--color-form-control-fg-readonly`.
   Disabled aliases remain `--color-form-control-{bg,fg,border}-disabled`.
   Keep component-specific aliases so applications can tune an individual field.
5. Mark descendant value-changing buttons with `data-readonly-affordance` to
   hide them through the shared utility, **and** gate their handlers/machine
   actions. CSS alone is not a read-only implementation. Alternatively do not
   render those buttons in read-only mode. Hidden/inert actions must not remain
   in the keyboard tab order. Preserve copy/password-reveal affordances.
6. Keep text selection enabled. Do not add `pointer-events:none`, disabled
   opacity, disabled cursor, or `user-select:none` to the read-only value.
   Preserve both validation indication and the normal keyboard focus ring.
7. Controlled and uncontrolled state must remain unchanged through mouse,
   keyboard, paste, drop, wheel/stepper and programmatic UI action paths. A
   parent may still update a controlled value. If read-only becomes true while
   a popup/editor is open, cancel its draft and close it; never commit that draft.

### Per-control affordances

- Text/number/phone/search: focus and select/copy text; hide clear, country
  changes and steppers; disable every mutation pathway, not just typing.
- Select/Combobox/CascadeSelect/ColorSelect: no opening by default; preserve
  the visible selected label(s), text selection/copy and the focus target.
  Hide remove-chip, clear and dropdown buttons. An explicit documented
  open-for-view feature may show details, but cannot select or remove values.
- DatePicker: no calendar/time picker opening by default; retain focus and
  copyable formatted value. Hide calendar/clear/step controls. A separately
  documented read-only calendar-view mode may browse dates without committing
  a value; it must not look like an editable picker.
- Checkbox/Switch/RadioGroup/RadioCard/Rating/Slider: preserve focus and value
  description, but ignore Space, arrows, drag and pointer changes. Do not use
  `disabled` as a shortcut; no disabled dimming. Non-text values need an
  accessible value, not fake editable text.
- FileUpload/tag editors: selected files/chips remain inspectable; copy,
  download or preview is allowed. Hide upload/replace/remove actions and prevent
  drop/paste mutations. This is the useful open-for-view exception.

### Form reset

Native form reset is **silent for every value control**: it never calls
`onChange`, `onValueChange`, `onCheckedChange`, `onInputValueChange` or equivalent
value-change callbacks and dispatches no native `input` or `change` events.
This matches native inputs, which emit no input/change event on reset.

- **Uncontrolled:** silently restore `defaultValue`/`defaultChecked` (Rating uses
  the current scale/precision constraints). Combobox restores its default
  selection and latest `defaultInputValue` when supplied.
- **Controlled:** keep the latest parent value. After the browser's reset action,
  re-sync visible text/selection, ARIA, the native input and FormData to that
  authoritative value. An application that wants to change controlled state on
  reset must handle the form's `onReset` explicitly.
- Wait until native and React reset cancellation has settled. A canceled reset
  changes nothing and emits no value notification. Follow the native control's
  actual form owner, including external `form` associations and reassociation.
- After restoring **either** ownership mode, assign the authoritative native
  `.value`/`.checked` through `syncReactFormControl` in
  `src/internal/form-control-lifecycle.ts`. Its React-wrapped setter also updates
  React's value tracker; do not use prototype setters or dispatch synthetic
  events. The next real user edit must emit exactly one normal notification.
- Reset does not activate an input or move focus. Read-only values retain the
  same ownership rules; disabled controls retain native submission semantics.

## 3. Canonical sizes

The canonical **interactive control** sizes are `sm`, `md`, `lg`, in that
order; default `md`. `sm` is for dense interfaces, `md` for ordinary forms,
`lg` for deliberately prominent or touch-friendly layouts. Related controls
and their labels, helper text, icons and option rows must follow the same size.
Geometry follows the content, not just the shared size name:

- Single-line boxed fields use `h-form-control-sm`, `h-form-control-md` or
  `h-form-control-lg`; these fixed heights derive from shared border, spacing
  and line height.
- Icon-only actions use square targets with matching width and height. Keep
  their icon centered and their accessible name on the action; do not give a
  text button square geometry.
- Text buttons use `button-size-sm/md/lg`: minimum height and block/inline
  padding aligned with the single-line field scale. Wrapped labels must grow
  the button rather than clip or overflow; never force `h-form-control-*` onto
  a text button.
- Multiline controls use minimum height and padding, not a forced one-line
  height. Popup options use `popup-size-sm/md/lg` and `popup-item-base`.

The actual audit found sm/md/lg on Button, ActionIcon, Input, Textarea,
NumericInput, PhoneInput, Combobox, DatePicker and most choice controls, but
legacy xs on Select, Menu and CascadeSelect. Keep existing xs props/tokens as
compatibility aliases for now; do not show them as a fourth canonical size or
introduce xs to new controls. This decision standardizes the scale, **not** a
breaking global typography shrink: the existing Figma md text remains 1.25rem;
dense UI explicitly chooses sm. See `size-scale-consistency.md` for history.

Justified non-control exceptions:

- Icon may use xs/xl/2xl and `current` to inherit text; icons are not independent
  interaction targets. ActionIcon still uses sm/md/lg with an adequate hit area.
- Label may use `current` to inherit its field's text. Button's existing
  `current` is an inline composition escape hatch, not a fourth demo size.
- StatusText uses a secondary 12/14/16px helper scale for sm/md/lg. Match
  the field's size prop; do not downsize helpers to compensate for body type.
  Labels retain their field scale and 700 weight.
- Badge/status labels may have a documented compact xs; this is not a reason to
  give every input xs. Content/media/dialog widths and heading levels are
  different axes, not control sizes.

Exactly one `Sizes` story shows **Small (sm)**, **Medium (md)**, **Large (lg)**,
with identical realistic copy/value and the same order. Do not make separate
Small/Medium/Large stories, or include xs/current in that matrix. Unsupported
sizes must be implemented by the component owner or explicitly reported; do
not fake a size with story-only classes. Compatibility sizing can be documented
in prose rather than another matrix. A different sizing axis must be named and
explained explicitly.

## 4. Floating surfaces and elevation

- Floating panels must be opaque. `--color-popup-bg` aliases the opaque
  `--color-fill-surface`, with `--color-popup-border`, `--border-width-popup`,
  `--radius-popup` and `--shadow-popup` for separation. Never reuse translucent
  scrim/overlay fills as a popup background.
- Select/Combobox/Menu list surfaces use `popup-surface-base` plus
  `popup-size-sm/md/lg`; this includes border, shadow, scrolling and the content
  z-index. Preserve the component's animation and placement properties.
- Rich popovers/calendars use their own layout/padding and component aliases,
  but those aliases must point to the popup background/border/shadow tokens.
  Popover and Tooltip arrow fills must match their panel fill.
- Add `popup-layer` to **both Content and Positioner** (including portals) for
  every floating panel, even when Content already uses `popup-surface-base`.
  It sets `z-index: calc(var(--z-popup) + var(--layer-index, 0))`.
  `--z-popup=60` sits above dialogs/drawers (up to the base 50 layer) and below
  guided overlays (80). Preserve Zag's `--layer-index`; never hard-code `z-50`
  or give every nested popup an unrelated magic value. A nested overlay above
  another overlay must use that overlay's managed layer context.
- Highlight (pale tint) and selection (filled row + checkmark) are distinct.
  Checked Menu items on an unfilled row use `text-popup-item-fg-checked`, not
  the selected-on-solid foreground. In Akros hover uses primary-100, selected
  uses primary-500, and checked foregrounds use readable semantic text, not a yellow palette step.
- Verify base/light, base/dark and Akros/light. Akros is intentionally light-only.

## 5. Stories and Docs are product documentation

- Every component has `tags: ["autodocs"]` and a Docs component description
  explaining what it is, when to use it and which alternatives fit other needs.
- Every exported story has a clear name and a one-sentence
  `parameters.docs.description.story` explaining **what** it shows and **why**.
- Order: Playground, Variants (if supported), Sizes (if supported), States
  (if supported), then meaningful component-specific examples.
- Compound components document every public member, not only the root props.
  Include each member's purpose, rendered element/role, required parent/context,
  required values (including uniqueness and matching Trigger/Content values),
  supported state/behavior props and the exact DOM element targeted by its ref.
  Explain root/provider setup and context hooks where public. Primary Docs
  source must use public package imports and include all data, helpers, state
  and cleanup needed to compile and preserve the demonstrated interaction;
  private story helpers are not copyable API documentation.
- Playground controls must visibly affect the rendered component. Hide internal
  IDs, refs and meaningless callback controls. Use realistic names, values and
  messages; preserve the message icon/association and focus contracts in demos.
- Demos do not navigate away, reload Storybook or perform real mutations.
  Model local state or action feedback. Prevent form submission/navigation as
  needed. No raw code snippets as visible content before the demo; use Docs
  source panels. No demos primarily teaching another component under this one.
- Use kit components and token layout classes. Semantic classes are acceptable
  in stories, never arbitrary Tailwind values or raw palette/spacing shortcuts.
- One primary action per surface. Form actions are secondary Cancel followed
  by primary Save/Create, aligned at the end; destructive actions are separate
  and labeled by consequence. Do not make every example button primary.
- Add interaction assertions for fixed behavior using the existing harness;
  check keyboard, accessible descriptions, read-only immutability, disabled tab
  order and multiline feedback. Visual checks use the shared browser only.

## Validation and handoff

Run scoped Biome and ESLint, TypeScript, token validation when CSS changes,
and available component behavior checks. Inspect `playwright.config.mts`:
this repository's Playwright suites require Docker; never launch a local browser
or another Storybook build/server during the shared overhaul. Shared-browser
checks must use the browser rules supplied with the task. Report unrelated
in-progress failures without editing another owner's files. Public visual/API
changes require a Figma-sync follow-up; do not publish Figma or change version
metadata during this pass.
