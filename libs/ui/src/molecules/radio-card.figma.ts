// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-33564
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/radio-card.tsx
// component=RadioCard

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const disabled = figma.selectedInstance.getEnum("state", {
  default: false,
  checked: false,
  disabled: true,
  invalid: false,
})

export default {
  id: "RadioCard",
  imports: ['import { RadioCard } from "@techsio/ui-kit/molecules/radio-card"'],
  example: figma.code`<RadioCard${figma.helpers.react.renderProp(
    "disabled",
    disabled
  )}${figma.helpers.react.renderProp("size", size)}>
        <RadioCard.Item value="a">
          <RadioCard.ItemControl>
            <RadioCard.ItemContent>
              <RadioCard.ItemText>Option A</RadioCard.ItemText>
            </RadioCard.ItemContent>
          </RadioCard.ItemControl>
        </RadioCard.Item>
      </RadioCard>`,
  metadata: { nestable: true },
}
