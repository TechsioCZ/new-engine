// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3538-167
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/vertical-navigation.tsx
// component=VerticalNavigation.Branch

import figma from "figma"

const instance = figma.selectedInstance
const label = instance.getString("label")
const open = instance.getEnum("open", { false: false, true: true })
const state = instance.getEnum("state", {
  base: "base",
  hover: "hover",
  focus: "focus",
  currentPath: "currentPath",
  disabled: "disabled",
})
const items = instance.getSlot("items")

// The slot should contain BranchContent. Root owns the sm/md size context.
export default {
  id: "VerticalNavigation.Branch",
  imports: [
    'import { VerticalNavigation } from "@techsio/ui-kit/molecules/vertical-navigation"',
  ],
  example: figma.code`<VerticalNavigation.Branch${figma.helpers.react.renderProp("defaultOpen", open)}${figma.helpers.react.renderProp("containsCurrent", state === "currentPath")}${figma.helpers.react.renderProp("disabled", state === "disabled")}><VerticalNavigation.Row><VerticalNavigation.Link href={href}>${label}</VerticalNavigation.Link><VerticalNavigation.BranchTrigger aria-label="Toggle ${label}"><VerticalNavigation.BranchIndicator /></VerticalNavigation.BranchTrigger></VerticalNavigation.Row>${items}</VerticalNavigation.Branch>`,
  metadata: { nestable: true },
}
