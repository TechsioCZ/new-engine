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
        checked: true,
        disabled: false,
        indeterminate: false,
        unchecked: false,
      }),
      children: figma.string("label"),
      disabled: figma.enum("state", {
        checked: false,
        disabled: true,
        indeterminate: false,
        unchecked: false,
      }),
      indeterminate: figma.enum("state", {
        checked: false,
        disabled: false,
        indeterminate: true,
        unchecked: false,
      }),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
    },
  },
)
