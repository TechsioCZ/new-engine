// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-26595
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/accordion.tsx
// component=Accordion

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const variant = figma.selectedInstance.getEnum("variant", {
  default: "default",
  borderless: "borderless",
  child: "child",
})
const shadow = figma.selectedInstance.getEnum("shadow", {
  none: "none",
  sm: "sm",
  md: "md",
})

export default {
  id: "Accordion",
  imports: ['import { Accordion } from "@libs/ui/molecules/accordion"'],
  example: figma.tsx`<Accordion${figma.helpers.react.renderProp(
    "shadow",
    shadow,
  )}${figma.helpers.react.renderProp(
    "size",
    size,
  )}${figma.helpers.react.renderProp("variant", variant)}>
        <Accordion.Item value="item-1">
          <Accordion.Header>Title</Accordion.Header>
          <Accordion.Content>Content</Accordion.Content>
        </Accordion.Item>
      </Accordion>`,
  metadata: { nestable: true },
}
