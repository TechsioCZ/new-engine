// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-36801
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/tree-view.tsx
// component=TreeView

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})

export default {
  id: "TreeView",
  imports: ['import { TreeView } from "@techsio/ui-kit/molecules/tree-view"'],
  example: figma.tsx`<TreeView data={[
        {
            id: "1",
            name: "Root",
            children: [{ id: "1-1", name: "Child" }],
        },
    ]}${figma.helpers.react.renderProp("size", size)}/>`,
  metadata: { nestable: true },
}
