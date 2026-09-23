// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3387-168
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/data-table.tsx
// component=DataTable

import figma from "figma"

/*
 * A column header has no standalone export — DataTable renders it from the
 * column definition. So the snippet is the column config that produces this
 * header, plus the DataTable flags the handles require.
 */
const align = figma.selectedInstance.getEnum("align", {
  start: "start",
  center: "center",
  end: "end",
})
const enableSorting = figma.selectedInstance.getBoolean("sortable")
const enableColumnReorder = figma.selectedInstance.getBoolean("showDragHandle")
const enableColumnResizing =
  figma.selectedInstance.getBoolean("showResizeHandle")

/*
 * asc/desc is sort *state*, not column config, so it maps to DataTable's
 * `sorting` prop. `none` means sortable but unsorted, and emits nothing.
 */
const sorting = figma.selectedInstance.getEnum("sort", {
  none: undefined,
  asc: '[{ id: "name", desc: false }]',
  desc: '[{ id: "name", desc: true }]',
})

export default {
  id: "DataTableColumnHeader",
  imports: ['import { DataTable } from "@techsio/ui-kit/organisms/data-table"'],
  example: figma.code`const columns = [
  { id: "name", header: "Column", accessorKey: "name", meta: { align: "${align}" } },
]

<DataTable columns={columns} data={data}${figma.helpers.react.renderProp(
    "enableSorting",
    enableSorting
  )}${sorting ? figma.code` sorting={${sorting}}` : ""}${figma.helpers.react.renderProp(
    "enableColumnReorder",
    enableColumnReorder
  )}${figma.helpers.react.renderProp(
    "enableColumnResizing",
    enableColumnResizing
  )} />`,
  metadata: { nestable: true },
}
