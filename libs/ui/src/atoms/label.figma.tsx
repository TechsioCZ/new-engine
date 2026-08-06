import figma from "@figma/code-connect"

import { Label } from "./label"

figma.connect(
  Label,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1-7840",
  {
    example: ({ size, disabled, required, children }) => (
      <Label disabled={disabled} required={required} size={size}>
        {children}
      </Label>
    ),
    imports: ['import { Label } from "@techsio/ui-kit/atoms/label"'],
    props: {
      children: figma.string("children"),
      disabled: figma.boolean("disabled"),
      required: figma.boolean("required"),
      size: figma.enum("size", {
        current: "current",
        lg: "lg",
        md: "md",
        sm: "sm",
      }),
    },
  },
)
