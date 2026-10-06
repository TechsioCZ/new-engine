// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3399-330
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/data-table.tsx
// component=DataTable

import figma from "figma"

/*
 * `Table2` is a static assembly — it exposes no component properties, so the
 * snippet is the canonical composition rather than a mapped one. The feature
 * flags below are the ones the assembly actually shows: a toolbar, a sortable
 * header, a filter row and a pagination bar.
 */
export default {
  id: "DataTable",
  imports: ['import { DataTable } from "@techsio/ui-kit/organisms/data-table"'],
  example: figma.code`<DataTable
  columns={columns}
  data={data}
  enableGlobalFilter
  enableSorting
  enableColumnFilters
  enablePagination
/>`,
  metadata: { nestable: true },
}
