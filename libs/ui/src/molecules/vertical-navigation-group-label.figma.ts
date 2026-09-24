// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3539-60
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/molecules/vertical-navigation.tsx
// component=VerticalNavigation.GroupLabel

import figma from "figma"

const label = figma.selectedInstance.getString("label")

// Root owns the sm/md size context.
export default {
  id: "VerticalNavigation.GroupLabel",
  imports: [
    'import { VerticalNavigation } from "@techsio/ui-kit/molecules/vertical-navigation"',
  ],
  example: figma.code`<VerticalNavigation.GroupLabel>${label}</VerticalNavigation.GroupLabel>`,
  metadata: { nestable: true },
}
