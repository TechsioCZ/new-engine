// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-25431
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/breadcrumb.tsx
// component=Breadcrumb

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})

export default {
  id: "Breadcrumb",
  imports: ['import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb"'],
  example: figma.code`<Breadcrumb${figma.helpers.react.renderProp(
    "size",
    size,
  )}>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Breadcrumb.CurrentLink>Current</Breadcrumb.CurrentLink>
        </Breadcrumb.Item>
      </Breadcrumb>`,
  metadata: { nestable: true },
}
