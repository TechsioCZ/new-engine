// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3462-18859
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/data-table.tsx
// component=DataTable

import figma from "figma"

/*
 * The master-detail box an expanded row opens into. Its content is whatever
 * `renderExpandedRow` returns; DataTable owns the box itself.
 */
export default {
  id: "DataTableDetailPanel",
  imports: ['import { DataTable } from "@techsio/ui-kit/organisms/data-table"'],
  example: figma.code`<DataTable
  columns={columns}
  data={data}
  renderExpandedRow={(row) => <OrderDetail order={row.original} />}
/>`,
  metadata: { nestable: true },
}
