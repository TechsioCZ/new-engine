import figma from "@figma/code-connect"
import { Input } from "../input"

figma.connect(
  Input,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=304-107",
  {
    imports: ['import { Input } from "@techsio/ui-kit/atoms/input"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      variant: figma.enum("state", {
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
    },
    example: ({ size, variant, disabled }) => (
      <Input disabled={disabled} size={size} variant={variant} />
    ),
  }
)
