import figma from "@figma/code-connect"

import { Checkbox } from "./checkbox"

figma.connect(
  Checkbox,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=428-9",
  {
    example: ({ checked, indeterminate, disabled, invalid }) => (
      <Checkbox
        checked={checked}
        disabled={disabled}
        indeterminate={indeterminate}
        invalid={invalid}
      />
    ),
    imports: ['import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"'],
    props: {
      checked: figma.enum("state", {
        checked: true,
        error: false,
        indeterminate: false,
        unchecked: false,
      }),
      disabled: figma.boolean("disabled"),
      indeterminate: figma.enum("state", {
        checked: false,
        error: false,
        indeterminate: true,
        unchecked: false,
      }),
      invalid: figma.enum("state", {
        checked: false,
        error: true,
        indeterminate: false,
        unchecked: false,
      }),
    },
  },
)
