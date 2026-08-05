import figma from "@figma/code-connect"

import { RadioCard } from "./radio-card"

figma.connect(
  RadioCard,
  "https://www.figma.com/design/12xb1pqXKwE2vbOByN3ntg/New-Design-System-vol.-2?node-id=1151-66",
  {
    example: ({ size, orientation, disabled }) => (
      <RadioCard disabled={disabled} orientation={orientation} size={size}>
        <RadioCard.Item value="a">
          <RadioCard.ItemControl>
            <RadioCard.ItemContent>
              <RadioCard.ItemText>Option A</RadioCard.ItemText>
            </RadioCard.ItemContent>
          </RadioCard.ItemControl>
        </RadioCard.Item>
      </RadioCard>
    ),
    imports: ['import { RadioCard } from "@libs/ui/molecules/radio-card"'],
    props: {
      disabled: figma.boolean("disabled"),
      orientation: figma.enum("orientation", {
        horizontal: "horizontal",
        vertical: "vertical",
      }),
      size: figma.enum("size", {
        sm: "sm",
        md: "md",
        lg: "lg",
      }),
    },
  }
)
