import figma from "@figma/code-connect"

import { Input } from "./input"

figma.connect(
  Input,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=304-107",
  {
    example: ({ size, variant, disabled }) => (
      <Input disabled={disabled} size={size} variant={variant} />
    ),
    imports: ['import { Input } from "@techsio/ui-kit/atoms/input"'],
    props: {
      disabled: figma.enum("state", {
        default: false,
        disabled: true,
        error: false,
        success: false,
        warning: false,
      }),
      size: figma.enum("size", {
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
      variant: figma.enum("state", {
        default: "default",
        disabled: "default",
        error: "error",
        success: "success",
        warning: "warning",
      }),
    },
  },
)
