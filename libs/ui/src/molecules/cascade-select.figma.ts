// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3178-335
// source=https://github.com/NMIT-WR/new-engine/blob/feat/cascade-select/libs/ui/src/molecules/cascade-select.tsx
// component=CascadeSelect

import figma from "figma"

const instance = figma.selectedInstance
const size = instance.getEnum("size", {
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
})
const state = instance.getEnum("state", {
  default: "default",
  // Interaction states are controlled by the browser, not validateStatus.
  hover: "default",
  focus: "default",
  error: "error",
  success: "success",
  warning: "warning",
  disabled: "disabled",
  readonly: "readonly",
})
const validateStatus =
  state === "disabled" || state === "readonly" ? "default" : state
const required = instance.getEnum("required", { false: false, true: true })
const showLabel = instance.getBoolean("showLabel")
const showStatusText = instance.getBoolean("showStatusText")
const showIndicator = instance.getBoolean("showIndicator")
const showClearTrigger = instance.getBoolean("showClearTrigger")
const placeholder = instance.getString("valueText")

// Compound slots must retain CascadeSelect's context-aware APIs. Read nested
// atom overrides, rather than replacing them with standalone Label/StatusText.
const labelInstance = showLabel ? instance.findInstance("Label") : undefined
const labelLayer =
  labelInstance?.type === "INSTANCE"
    ? labelInstance.findText("Label")
    : undefined
const label = labelLayer?.type === "TEXT" ? labelLayer.textContent : undefined
const labelSize =
  labelInstance?.type === "INSTANCE"
    ? labelInstance.getEnum("size", {
        current: undefined,
        sm: "sm",
        md: "md",
        lg: "lg",
      })
    : undefined

const statusInstance = showStatusText
  ? instance.findInstance("StatusText")
  : undefined
const statusLayer =
  statusInstance?.type === "INSTANCE"
    ? statusInstance.findLayers((node) => node.type === "TEXT")[0]
    : undefined
const statusText =
  statusLayer?.type === "TEXT" ? statusLayer.textContent : undefined
const statusSize =
  statusInstance?.type === "INSTANCE"
    ? statusInstance.getEnum("size", { sm: "sm", md: "md", lg: "lg" })
    : undefined
const status =
  statusInstance?.type === "INSTANCE"
    ? statusInstance.getEnum("status", {
        default: "default",
        error: "error",
        success: "success",
        warning: "warning",
      })
    : undefined

// The nested Icon owns its glyph swap so root size changes cannot reset it.
// Indicator accepts children (not Icon's icon/color props), so render the
// connected nested Icon inside the context-aware indicator span.
const indicatorInstance = showIndicator
  ? instance.findInstance("Indicator")
  : undefined
const indicatorCode =
  indicatorInstance?.type === "INSTANCE"
    ? indicatorInstance.executeTemplate().example
    : undefined

export default {
  id: "CascadeSelect",
  imports: [
    'import { CascadeSelect } from "@techsio/ui-kit/molecules/cascade-select"',
  ],
  // Supply items and value/defaultValue from application state. Display labels
  // are not stable item identifiers, so never infer a value path from them.
  example: figma.code`<CascadeSelect items={items}${figma.helpers.react.renderProp(
    "size",
    size
  )}${figma.helpers.react.renderProp(
    "validateStatus",
    validateStatus
  )}${figma.helpers.react.renderProp(
    "disabled",
    state === "disabled"
  )}${figma.helpers.react.renderProp(
    "readOnly",
    state === "readonly"
  )}${figma.helpers.react.renderProp("required", required)}>
  ${showLabel ? figma.code`<CascadeSelect.Label${figma.helpers.react.renderProp("size", labelSize)}>${figma.helpers.react.renderChildren(label)}</CascadeSelect.Label>` : ""}
  <CascadeSelect.Control>
    <CascadeSelect.Trigger>
      <CascadeSelect.ValueText${figma.helpers.react.renderProp("placeholder", placeholder)} />
      ${showIndicator ? figma.code`<CascadeSelect.Indicator>${indicatorCode}</CascadeSelect.Indicator>` : ""}
    </CascadeSelect.Trigger>
    ${showClearTrigger ? figma.code`<CascadeSelect.ClearTrigger />` : ""}
  </CascadeSelect.Control>
  <CascadeSelect.Positioner>
    <CascadeSelect.Content>
      <CascadeSelect.Node />
    </CascadeSelect.Content>
  </CascadeSelect.Positioner>
  ${showStatusText ? figma.code`<CascadeSelect.StatusText${figma.helpers.react.renderProp("size", statusSize)}${figma.helpers.react.renderProp("status", status)}>${figma.helpers.react.renderChildren(statusText)}</CascadeSelect.StatusText>` : ""}
</CascadeSelect>`,
  metadata: { nestable: true },
}
