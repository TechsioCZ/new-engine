import figma from "@figma/code-connect"

import { Select } from "./select"

figma.connect(
  Select,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=761-571",
  {
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
    imports: ['import { Select } from "@techsio/ui-kit/molecules/select"'],
    props: {
      disabled: figma.enum("state", {
        default: false,
        disabled: true,
        error: false,
        readonly: false,
        success: false,
        warning: false,
      }),
      required: figma.boolean("required"),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
        xs: "xs",
      }),
      validateStatus: figma.enum("state", {
        default: "default",
        disabled: "default",
        error: "error",
        readonly: "default",
        success: "success",
        warning: "warning",
      }),
    },
  },
)
