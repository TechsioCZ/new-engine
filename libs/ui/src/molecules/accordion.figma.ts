// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-26595
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/accordion.tsx
// component=Accordion

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
// Figma still names the property variant; code reads appearance (+ nested).
const appearance = figma.selectedInstance.getEnum("variant", {
  default: "outline",
  borderless: "ghost",
  child: "ghost",
})
const nested = figma.selectedInstance.getEnum("variant", {
  child: true,
})
const shadow = figma.selectedInstance.getEnum("shadow", {
  none: "none",
  sm: "sm",
  md: "md",
})

export default {
  id: "Accordion",
  imports: ['import { Accordion } from "@techsio/ui-kit/molecules/accordion"'],
  example: figma.code`<Accordion${figma.helpers.react.renderProp(
    "shadow",
    shadow
  )}${figma.helpers.react.renderProp(
    "size",
    size
  )}${figma.helpers.react.renderProp("appearance", appearance)}${figma.helpers.react.renderProp(
    "nested",
    nested
  )}>
        <Accordion.Item value="item-1">
          <Accordion.Header>Title</Accordion.Header>
          <Accordion.Content>Content</Accordion.Content>
        </Accordion.Item>
      </Accordion>`,
  metadata: { nestable: true },
}
