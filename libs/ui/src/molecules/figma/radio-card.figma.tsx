import figma from "@figma/code-connect"
import { RadioCard } from "../radio-card"

figma.connect(
  RadioCard,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1151-66",
  {
    imports: ['import { RadioCard } from "@techsio/ui-kit/molecules/radio-card"'],
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
      <RadioCard size={size} orientation={orientation} disabled={disabled}>
        <RadioCard.Item value="a">
          <RadioCard.ItemControl>
            <RadioCard.ItemContent>
              <RadioCard.ItemText>Option A</RadioCard.ItemText>
            </RadioCard.ItemContent>
          </RadioCard.ItemControl>
        </RadioCard.Item>
      </RadioCard>
    ),
  }
)
