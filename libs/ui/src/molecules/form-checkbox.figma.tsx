import figma from "@figma/code-connect"

import { FormCheckbox } from "./form-checkbox"

figma.connect(
  FormCheckbox,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=916-487",
  {
    example: ({ size, checked, indeterminate, disabled, children }) => (
      <FormCheckbox
        checked={checked}
        disabled={disabled}
        indeterminate={indeterminate}
        size={size}
      >
        {children}
      </FormCheckbox>
    ),
    imports: [
      'import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"',
    ],
    props: {
      checked: figma.enum("state", {
        unchecked: false,
        checked: true,
        indeterminate: false,
        disabled: false,
      }),
      children: figma.string("label"),
      disabled: figma.enum("state", {
        unchecked: false,
        checked: false,
        indeterminate: false,
        disabled: true,
      }),
      indeterminate: figma.enum("state", {
        unchecked: false,
        checked: false,
        indeterminate: true,
        disabled: false,
      }),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
    },
  }
)
