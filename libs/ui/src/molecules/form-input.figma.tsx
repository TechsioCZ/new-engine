import figma from "@figma/code-connect"

import { FormInput } from "./form-input"

figma.connect(
  FormInput,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=306-266",
  {
    example: ({ size, validateStatus, disabled, required }) => (
      <FormInput
        disabled={disabled}
        id="field"
        label="Label"
        required={required}
        size={size}
        validateStatus={validateStatus}
      />
    ),
    imports: [
      'import { FormInput } from "@techsio/ui-kit/molecules/form-input"',
    ],
    props: {
      disabled: figma.enum("state", {
        default: false,
        disabled: true,
        error: false,
        success: false,
        warning: false,
      }),
      required: figma.boolean("required"),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
      validateStatus: figma.enum("state", {
        default: "default",
        disabled: "default",
        error: "error",
        success: "success",
        warning: "warning",
      }),
    },
  },
)
