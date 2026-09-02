// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-37368
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/atoms/link.tsx
// component=Link

import figma from "figma"

// no text component property — the label is a plain text layer
const childrenLayer = figma.selectedInstance.findText("Link text")
const children =
  childrenLayer.type !== "ERROR" ? childrenLayer.textContent : undefined

export default {
  id: "Link",
  imports: ['import { Link } from "@techsio/ui-kit/atoms/link"'],
  example: figma.code`<Link href="#">${figma.helpers.react.renderChildren(
    children
  )}</Link>`,
  metadata: { nestable: true },
}
