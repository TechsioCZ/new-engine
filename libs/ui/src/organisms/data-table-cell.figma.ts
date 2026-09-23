// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3382-29
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/data-table.tsx
// component=DataTable

import figma from "figma"

/*
 * A body cell has no standalone export. `align` is column meta, `pinned` is
 * column pinning, and `editing`/`error` are the inline editor — all of them
 * configured on DataTable or the column, never written by hand.
 */
const align = figma.selectedInstance.getEnum("align", {
  start: "start",
  center: "center",
  end: "end",
})
const enableColumnPinning = figma.selectedInstance.getBoolean("pinned")
const enableInlineEdit = figma.selectedInstance.getEnum("state", {
  default: false,
  editing: true,
  error: true,
})

export default {
  id: "DataTableCell",
  imports: ['import { DataTable } from "@techsio/ui-kit/organisms/data-table"'],
  example: figma.code`const columns = [
  { id: "name", header: "Column", accessorKey: "name", meta: { align: "${align}" } },
]

<DataTable columns={columns} data={data}${figma.helpers.react.renderProp(
    "enableInlineEdit",
    enableInlineEdit
  )}${figma.helpers.react.renderProp(
    "enableColumnPinning",
    enableColumnPinning
  )} />`,
  metadata: { nestable: true },
}
