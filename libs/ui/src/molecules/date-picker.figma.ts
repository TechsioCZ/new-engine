// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2877-298
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/date-picker.tsx
// component=DatePicker

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const selectionMode = figma.selectedInstance.getEnum("selectionMode", {
  single: "single",
  range: "range",
})
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  error: false,
  disabled: true,
  readonly: false,
})
const invalid = figma.selectedInstance.getEnum("state", {
  default: false,
  error: true,
  disabled: false,
  readonly: false,
})
const readOnly = figma.selectedInstance.getEnum("state", {
  default: false,
  error: false,
  disabled: false,
  readonly: true,
})

export default {
  id: "DatePicker",
  imports: [
    'import { DatePicker } from "@techsio/ui-kit/molecules/date-picker"',
  ],
  example: figma.code`<DatePicker.Root${figma.helpers.react.renderProp(
    "disabled",
    disabled,
  )}${figma.helpers.react.renderProp(
    "invalid",
    invalid,
  )}${figma.helpers.react.renderProp(
    "readOnly",
    readOnly,
  )}${figma.helpers.react.renderProp(
    "selectionMode",
    selectionMode,
  )}${figma.helpers.react.renderProp("size", size)}>
        <DatePicker.Label>Label</DatePicker.Label>
        <DatePicker.Control>
          <DatePicker.Segments />
          <DatePicker.IndicatorGroup>
            <DatePicker.ClearTrigger />
            <DatePicker.Trigger />
          </DatePicker.IndicatorGroup>
        </DatePicker.Control>
      </DatePicker.Root>`,
  metadata: { nestable: true },
}
