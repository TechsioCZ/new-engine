// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3382-29
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/data-table.tsx
// component=DataTable

import figma from "figma"

/*
 * A body cell has no standalone export. `align` is column meta, `pinned` is
 * column pinning, and `editing`/`error` are the inline editor — all of them
 * configured on DataTable or the column, never written by hand. Inline edit
 * only turns a cell into an editor when its column sets `meta.editable`, so the
 * editing states emit that too; `onEditCommit` is where the edit is persisted.
 */
const align = figma.selectedInstance.getEnum("align", {
  start: "start",
  center: "center",
  end: "end",
})
const enableColumnPinning = figma.selectedInstance.getBoolean("pinned")
const state = figma.selectedInstance.getEnum("state", {
  default: "default",
  editing: "editing",
  error: "error",
})
const enableInlineEdit = state !== "default"

/*
 * `editingRowId` is controlled so the example actually opens row "0" in the
 * editor instead of only enabling editing. The `error` variant adds the
 * `meta.validate` that produces the message: it shows after an invalid value is
 * committed, the same way the Figma variant draws it.
 */
const meta =
  state === "error"
    ? `{ align: "${align}", editable: true, validate: (value) => (Number(value) > 0 ? undefined : "Must be a positive number") }`
    : state === "editing"
      ? `{ align: "${align}", editable: true }`
      : `{ align: "${align}" }`

export default {
  id: "DataTableCell",
  imports: [
    'import { useState } from "react"',
    'import { DataTable } from "@techsio/ui-kit/organisms/data-table"',
  ],
  example: figma.code`${
    enableInlineEdit
      ? figma.code`const [editingRowId, setEditingRowId] = useState<string | null>("0")

`
      : ""
  }const columns = [
  { id: "name", header: "Column", accessorKey: "name", meta: ${meta} },
]

<DataTable columns={columns} data={data}${
    enableInlineEdit
      ? figma.code` enableInlineEdit editingRowId={editingRowId} onEditingRowIdChange={setEditingRowId} onEditCommit={saveRow}`
      : ""
  }${figma.helpers.react.renderProp(
    "enableColumnPinning",
    enableColumnPinning
  )} />`,
  metadata: { nestable: true },
}
