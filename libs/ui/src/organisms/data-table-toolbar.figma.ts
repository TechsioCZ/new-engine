// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3396-2080
// source=https://github.com/TechsioCZ/new-engine/blob/master/libs/ui/src/organisms/data-table.tsx
// component=DataTable.Toolbar

import figma from "figma"

/*
 * The toolbar reads `size` from DataTable's context rather than taking it as a
 * prop, so the Figma `size` variant has no code counterpart and is omitted.
 */
export default {
  id: "DataTableToolbar",
  imports: ['import { DataTable } from "@techsio/ui-kit/organisms/data-table"'],
  example: figma.code`<DataTable.Toolbar>
  <DataTable.GlobalSearch />
  <DataTable.ToolbarActions />
  <DataTable.ColumnVisibility />
</DataTable.Toolbar>`,
  metadata: { nestable: true },
}
