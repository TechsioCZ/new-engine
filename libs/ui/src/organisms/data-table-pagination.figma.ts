// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3397-666
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/data-table.tsx
// component=DataTable.Pagination

import figma from "figma"

/*
 * Pagination renders the range label, the pager and the page-size Select from
 * DataTable's context. `pageSizeOptions` lives on DataTable itself, which is
 * why it appears here rather than on this sub-component.
 */
export default {
  id: "DataTablePagination",
  imports: ['import { DataTable } from "@techsio/ui-kit/organisms/data-table"'],
  example: figma.code`<DataTable
  columns={columns}
  data={data}
  enablePagination
  pageSizeOptions={[10, 15, 25, 50]}
/>`,
  metadata: { nestable: true },
}
