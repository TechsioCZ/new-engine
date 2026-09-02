// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-37368
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/link.tsx
// component=Link

import figma from "figma"

const children = figma.selectedInstance.getString("children")

export default {
  id: "Link",
  imports: ['import { Link } from "@techsio/ui-kit/atoms/link"'],
  example: figma.tsx`<Link href="#">${figma.helpers.react.renderChildren(
    children,
  )}</Link>`,
  metadata: { nestable: true },
}
