// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-35399
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/tabs.tsx
// component=Tabs

import figma from "figma"

// Figma still names the property variant; code reads appearance.
const appearance = figma.selectedInstance.getEnum("variant", {
  default: "underline",
  line: "line",
  solid: "solid",
  outline: "outline",
})
const orientation = figma.selectedInstance.getEnum("orientation", {
  horizontal: "horizontal",
  vertical: "vertical",
})

export default {
  id: "Tabs",
  imports: ['import { Tabs } from "@techsio/ui-kit/molecules/tabs"'],
  example: figma.code`<Tabs defaultValue="tab-1"${figma.helpers.react.renderProp(
    "orientation",
    orientation
  )}${figma.helpers.react.renderProp("appearance", appearance)}>
        <Tabs.List>
          <Tabs.Trigger value="tab-1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab-2">Tab 2</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab-1">Content 1</Tabs.Content>
        <Tabs.Content value="tab-2">Content 2</Tabs.Content>
      </Tabs>`,
  metadata: { nestable: true },
}
