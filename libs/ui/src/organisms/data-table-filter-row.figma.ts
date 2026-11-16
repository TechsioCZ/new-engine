// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3398-309
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/data-table.tsx
// component=DataTable

import figma from "figma"

/*
 * The filter row is rendered per column when `enableColumnFilters` is on. The
 * control it shows comes from the column's `type`, which is also what decides
 * the operator set behind the little filter affordance.
 */
export default {
  id: "DataTableFilterRow",
  imports: [
    'import { type ColumnDef, DataTable } from "@techsio/ui-kit/organisms/data-table"',
  ],
  example: figma.code`const columns: ColumnDef<Record<string, unknown>>[] = [
  {
    id: "name",
    header: "Column",
    accessorKey: "name",
    meta: { type: "string" },
  },
]

<DataTable columns={columns} data={data} enableColumnFilters />`,
  metadata: { nestable: true },
}
