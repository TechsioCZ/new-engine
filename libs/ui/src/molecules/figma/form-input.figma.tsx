import figma from "@figma/code-connect"
import { FormInput } from "../form-input"

figma.connect(
  FormInput,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=306-266",
  {
    imports: ['import { FormInput } from "@techsio/ui-kit/molecules/form-input"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      validateStatus: figma.enum("state", {
        default: "default",
        error: "error",
        success: "success",
        warning: "warning",
        disabled: "default",
      }),
      disabled: figma.enum("state", {
        default: false,
        error: false,
        success: false,
        warning: false,
        disabled: true,
      }),
      required: figma.boolean("required"),
    },
    example: ({ size, validateStatus, disabled, required }) => (
      <FormInput
        id="field"
        label="Label"
        size={size}
        validateStatus={validateStatus}
        disabled={disabled}
        required={required}
      />
    ),
  }
)
