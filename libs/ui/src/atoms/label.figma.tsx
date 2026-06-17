import figma from "@figma/code-connect"
import { Label } from "./label"

figma.connect(
  Label,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1-7840",
  {
    imports: ['import { Label } from "@techsio/ui-kit/atoms/label"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
        current: "current",
      }),
      disabled: figma.boolean("disabled"),
      required: figma.boolean("required"),
      children: figma.string("children"),
    },
    example: ({ size, disabled, required, children }) => (
      <Label disabled={disabled} required={required} size={size}>
        {children}
      </Label>
    ),
  }
)
