import figma from "@figma/code-connect"
import { RadioGroup } from "./radio-group"

figma.connect(
  RadioGroup,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1149-66",
  {
    imports: ['import { RadioGroup } from "@libs/ui/molecules/radio-group"'],
    props: {
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
      orientation: figma.enum("orientation", {
        horizontal: "horizontal",
        vertical: "vertical",
      }),
      disabled: figma.boolean("disabled"),
    },
    example: ({ size, orientation, disabled }) => (
      <RadioGroup disabled={disabled} orientation={orientation} size={size}>
        <RadioGroup.Item value="a">
          <RadioGroup.ItemControl />
          <RadioGroup.ItemText>Option A</RadioGroup.ItemText>
        </RadioGroup.Item>
        <RadioGroup.Item value="b">
          <RadioGroup.ItemControl />
          <RadioGroup.ItemText>Option B</RadioGroup.ItemText>
        </RadioGroup.Item>
      </RadioGroup>
    ),
  }
)
