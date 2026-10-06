// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3532-2
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/vertical-navigation.tsx
// component=VerticalNavigation.Link

import figma from "figma"

const instance = figma.selectedInstance
const label = instance.getString("label")
const state = instance.getEnum("state", {
  base: "base",
  hover: "hover",
  focus: "focus",
  current: "current",
  disabled: "disabled",
})

// Hover and focus are browser states. Root owns the sm/md size context.
export default {
  id: "VerticalNavigation.Link",
  imports: [
    'import { VerticalNavigation } from "@techsio/ui-kit/molecules/vertical-navigation"',
  ],
  example: figma.code`<VerticalNavigation.Item><VerticalNavigation.Link href={href}${figma.helpers.react.renderProp("current", state === "current")}${figma.helpers.react.renderProp("disabled", state === "disabled")}>${label}</VerticalNavigation.Link></VerticalNavigation.Item>`,
  metadata: { nestable: true },
}
