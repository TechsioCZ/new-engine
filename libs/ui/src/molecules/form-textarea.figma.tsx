import figma from "@figma/code-connect"
import { FormTextarea } from "./form-textarea"

figma.connect(
  FormTextarea,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=929-317",
  {
    imports: [
      'import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea"',
    ],
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
      <FormTextarea
        disabled={disabled}
        id="field"
        label="Label"
        required={required}
        size={size}
        validateStatus={validateStatus}
      />
    ),
  }
)
