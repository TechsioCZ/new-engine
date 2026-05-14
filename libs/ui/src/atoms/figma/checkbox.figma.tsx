import figma from "@figma/code-connect"
import { Checkbox } from "../checkbox"

figma.connect(
  Checkbox,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=428-9",
  {
    imports: ['import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"'],
    props: {
      checked: figma.enum("state", {
        unchecked: false,
        checked: true,
        indeterminate: false,
        error: false,
      }),
      indeterminate: figma.enum("state", {
        unchecked: false,
        checked: false,
        indeterminate: true,
        error: false,
      }),
      disabled: figma.boolean("disabled"),
      invalid: figma.enum("state", {
        unchecked: false,
        checked: false,
        indeterminate: false,
        error: true,
      }),
    },
    example: ({ checked, indeterminate, disabled, invalid }) => (
      <Checkbox
        checked={checked}
        disabled={disabled}
        indeterminate={indeterminate}
        invalid={invalid}
      />
    ),
  }
)
