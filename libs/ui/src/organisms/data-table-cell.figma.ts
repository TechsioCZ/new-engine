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
 * Pinning is off by default *and* the pinned list starts empty, so the pinned
 * variant also seeds `columnPinning` — otherwise the cell would not stick.
 */
const pinning = enableColumnPinning
  ? figma.code` enableColumnPinning columnPinning={{ start: ["name"], end: [] }}`
  : ""

/*
 * `editingRowId` is controlled so the example actually opens row "0" in the
 * editor instead of only enabling editing. The `error` variant adds the
 * `meta.validate` that produces the message. That message only appears after
 * an invalid value is committed: DataTable holds edit errors in internal state
 * with no prop to seed them, so no snippet can render the error on first paint.
 * The emitted code says so rather than implying it does.
 */
const metaByState = {
  default: `{ align: "${align}" }`,
  editing: `{ align: "${align}", editable: true }`,
  error: `{ align: "${align}", editable: true, validate: (value) => (Number(value) > 0 ? undefined : "Must be a positive number") }`,
}
const meta = metaByState[state]

export default {
  id: "DataTableCell",
  imports: [
    'import { useState } from "react"',
    'import { type ColumnDef, DataTable } from "@techsio/ui-kit/organisms/data-table"',
  ],
  example: figma.code`${
    enableInlineEdit
      ? figma.code`const [editingRowId, setEditingRowId] = useState<string | null>("0")
${
  state === "error"
    ? figma.code`// The error shows after committing an invalid value: validate runs on commit,
// and DataTable keeps edit errors internal, so no prop can pre-seed them.
`
    : ""
}
`
      : ""
  }const columns: ColumnDef<Record<string, unknown>>[] = [
  { id: "name", header: "Column", accessorKey: "name", meta: ${meta} },
]

<DataTable columns={columns} data={data}${
    enableInlineEdit
      ? figma.code` enableInlineEdit editingRowId={editingRowId} onEditingRowIdChange={setEditingRowId} onEditCommit={saveRow}`
      : ""
  }${pinning} />`,
  metadata: { nestable: true },
}
