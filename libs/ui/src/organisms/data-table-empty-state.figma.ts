// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3390-47
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/data-table.tsx
// component=DataTable

import figma from "figma"

/*
 * The empty state is rendered by DataTable when there are no rows; its copy
 * comes from `translations`, not from props on a sub-component.
 */
const title = figma.selectedInstance.getString("title")
const description = figma.selectedInstance.getString("description")

export default {
  id: "DataTableEmptyState",
  imports: ['import { DataTable } from "@techsio/ui-kit/organisms/data-table"'],
  example: figma.code`<DataTable
  columns={columns}
  data={[]}
  translations={{
    emptyTitle: "${title}",
    emptyDescription: "${description}",
  }}
/>`,
  metadata: { nestable: true },
}
