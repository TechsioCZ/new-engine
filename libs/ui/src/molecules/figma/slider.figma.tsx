import figma from "@figma/code-connect"
import { Slider } from "../slider"

figma.connect(
  Slider,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1141-48",
  {
    imports: ['import { Slider } from "@techsio/ui-kit/molecules/slider"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      disabled: figma.boolean("disabled"),
      validateStatus: figma.enum("validateStatus", {
        default: "default",
        error: "error",
      }),
    },
    example: ({ size, disabled, validateStatus }) => (
      <Slider
        size={size}
        disabled={disabled}
        validateStatus={validateStatus}
        min={0}
        max={100}
        defaultValue={[50]}
      />
    ),
  }
)
