import figma from "@figma/code-connect"
import { Combobox } from "../combobox"

figma.connect(
  Combobox,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1189-153",
  {
    imports: ['import { Combobox } from "@techsio/ui-kit/molecules/combobox"'],
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
      <Combobox
        size={size}
        validateStatus={validateStatus}
        disabled={disabled}
        required={required}
        items={[]}
        label="Label"
      />
    ),
  }
)
