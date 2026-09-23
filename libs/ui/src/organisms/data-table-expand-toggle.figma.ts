// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3395-95
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/data-table.tsx
// component=DataTable

import figma from "figma"

/*
 * The chevron is rendered by DataTable for any expandable row. It appears when
 * a row can expand — either tree data via `getSubRows` or a detail panel via
 * `renderExpandedRow`. `state` is runtime, so both variants emit the same
 * enabling config.
 */
export default {
  id: "DataTableExpandToggle",
  imports: ['import { DataTable } from "@techsio/ui-kit/organisms/data-table"'],
  example: figma.code`<DataTable
  columns={columns}
  data={data}
  renderExpandedRow={(row) => <OrderDetail order={row.original} />}
/>`,
  metadata: { nestable: true },
}
