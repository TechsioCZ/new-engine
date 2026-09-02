// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=2774-32388
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/pagination.tsx
// component=Pagination

import figma from "figma"

const size = figma.selectedInstance.getEnum("size", {
  sm: "sm",
  md: "md",
  lg: "lg",
})

export default {
  id: "Pagination",
  imports: ['import { Pagination } from "@libs/ui/molecules/pagination"'],
  example: figma.tsx`<Pagination count={100} defaultPage={1} getPageUrl={(page) => \`?page=${page}\`} pageSize={10}${figma.helpers.react.renderProp(
    "size",
    size,
  )}/>`,
  metadata: { nestable: true },
}
