// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-33126
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/radio-group.tsx
// component=RadioGroup

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
  id: "RadioGroup",
  imports: ['import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group"'],
  example: figma.tsx`<RadioGroup${figma.helpers.react.renderProp(
    "disabled",
    disabled
  )}${figma.helpers.react.renderProp("size", size)}>
        <RadioGroup.Item value="a">
          <RadioGroup.ItemControl />
          <RadioGroup.ItemText>Option A</RadioGroup.ItemText>
        </RadioGroup.Item>
        <RadioGroup.Item value="b">
          <RadioGroup.ItemControl />
          <RadioGroup.ItemText>Option B</RadioGroup.ItemText>
        </RadioGroup.Item>
      </RadioGroup>`,
  metadata: { nestable: true },
}
