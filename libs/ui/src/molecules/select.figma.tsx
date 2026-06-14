import figma from "@figma/code-connect"
import { Select } from "./select"

figma.connect(
  Select,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=761-571",
  {
    imports: ['import { Select } from "@techsio/ui-kit/molecules/select"'],
    props: {
      size: figma.enum("size", {
        xs: "xs",
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
        readonly: "default",
      }),
      disabled: figma.enum("state", {
        default: false,
        error: false,
        success: false,
        warning: false,
        disabled: true,
        readonly: false,
      }),
      required: figma.boolean("required"),
    },
    example: ({ size, validateStatus, disabled, required }) => (
      <Select
        disabled={disabled}
        items={[]}
        required={required}
        size={size}
        validateStatus={validateStatus}
      >
        <Select.Label>Label</Select.Label>
        <Select.Trigger />
      </Select>
    ),
  }
)
