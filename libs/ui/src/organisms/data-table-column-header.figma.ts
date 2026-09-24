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
 * asc/desc is sort *state*, not column config. DataTable has no initial-sort
 * prop, so `sorting` makes it controlled — and a controlled `sorting` without
 * `onSortingChange` freezes the header in that direction. The snippet therefore
 * wires both through `useState`. `none` means sortable but unsorted, and emits
 * no state at all.
 */
const initialSort = figma.selectedInstance.getEnum("sort", {
  none: undefined,
  asc: "false",
  desc: "true",
})

export default {
  id: "DataTableColumnHeader",
  imports: [
    'import { useState } from "react"',
    'import { DataTable } from "@techsio/ui-kit/organisms/data-table"',
  ],
  example: figma.code`${
    initialSort
      ? figma.code`const [sorting, setSorting] = useState([{ id: "name", desc: ${initialSort} }])

`
      : ""
  }const columns = [
  { id: "name", header: "Column", accessorKey: "name", meta: { align: "${align}" } },
]

<DataTable columns={columns} data={data}${figma.helpers.react.renderProp(
    "enableSorting",
    enableSorting
  )}${initialSort ? figma.code` sorting={sorting} onSortingChange={setSorting}` : ""}${figma.helpers.react.renderProp(
    "enableColumnReorder",
    enableColumnReorder
  )}${figma.helpers.react.renderProp(
    "enableColumnResizing",
    enableColumnResizing
  )} />`,
  metadata: { nestable: true },
}
