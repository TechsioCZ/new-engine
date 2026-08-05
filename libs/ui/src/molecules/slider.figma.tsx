import figma from "@figma/code-connect"

import { Slider } from "./slider"

figma.connect(
  Slider,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1141-48",
  {
    example: ({ size, disabled, validateStatus }) => (
      <Slider
        defaultValue={[50]}
        disabled={disabled}
        max={100}
        min={0}
        size={size}
        validateStatus={validateStatus}
      />
    ),
    imports: ['import { Slider } from "@techsio/ui-kit/molecules/slider"'],
    props: {
      disabled: figma.boolean("disabled"),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      validateStatus: figma.enum("validateStatus", {
        default: "default",
        error: "error",
      }),
    },
  },
)
