// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-35399
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/tabs.tsx
// component=Tabs

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})
const orientation = figma.selectedInstance.getEnum("orientation", {
  horizontal: "horizontal",
  vertical: "vertical",
})

export default {
  id: "Tabs",
  imports: ['import { Tabs } from "@libs/ui/molecules/tabs"'],
  example: figma.tsx`<Tabs defaultValue="tab-1"${figma.helpers.react.renderProp(
    "orientation",
    orientation,
  )}${figma.helpers.react.renderProp("size", size)}>
        <Tabs.List>
          <Tabs.Trigger value="tab-1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab-2">Tab 2</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab-1">Content 1</Tabs.Content>
        <Tabs.Content value="tab-2">Content 2</Tabs.Content>
      </Tabs>`,
  metadata: { nestable: true },
}
