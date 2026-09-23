// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3386-62
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/data-table.tsx
// component=DataTable

import figma from "figma"

/*
 * Rows are rendered by DataTable, so every Figma property here is a DataTable
 * prop rather than something written per row. `hover` is a pure CSS state with
 * no prop behind it, which is why it maps to nothing.
 */
const striped = figma.selectedInstance.getEnum("striped", {
  false: false,
  true: true,
})
const tintNestedRows = figma.selectedInstance.getBoolean("nested")
const enableRowReorder = figma.selectedInstance.getBoolean("showDragHandle")
const enableRowSelection = figma.selectedInstance.getEnum("state", {
  base: false,
  hover: false,
  selected: true,
})

export default {
  id: "DataTableRow",
  imports: ['import { DataTable } from "@techsio/ui-kit/organisms/data-table"'],
  example: figma.code`<DataTable columns={columns} data={data}${figma.helpers.react.renderProp(
    "striped",
    striped
  )}${figma.helpers.react.renderProp(
    "tintNestedRows",
    tintNestedRows
  )}${figma.helpers.react.renderProp(
    "enableRowSelection",
    enableRowSelection
  )}${figma.helpers.react.renderProp("enableRowReorder", enableRowReorder)} />`,
  metadata: { nestable: true },
}
