import figma from "@figma/code-connect"
import { Textarea } from "./textarea"

figma.connect(
  Textarea,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=502-93",
  {
    imports: ['import { Textarea } from "@techsio/ui-kit/atoms/textarea"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      variant: figma.enum("variant", {
        default: "default",
        error: "error",
        success: "success",
        warning: "warning",
        borderless: "borderless",
      }),
      disabled: figma.enum("state", {
        default: false,
        disabled: true,
        readonly: false,
      }),
      readonly: figma.enum("state", {
        default: false,
        disabled: false,
        readonly: true,
      }),
    },
    example: ({ size, variant, disabled, readonly }) => (
      <Textarea
        disabled={disabled}
        readonly={readonly}
        size={size}
        variant={variant}
      />
    ),
  }
)
