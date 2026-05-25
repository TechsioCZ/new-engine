import { Table } from "@techsio/ui-kit/organisms/table"
import type { ComponentPropsWithoutRef, ReactNode, RefObject } from "react"
import { cx } from "../utils/cx"

type AdminTableWidth = "xl" | "2xl" | "3xl"

type AdminTableRootProps = ComponentPropsWithoutRef<"table"> & {
  captionPlacement?: "top" | "bottom"
  interactive?: boolean
  ref?: RefObject<HTMLTableElement>
  showColumnBorder?: boolean
  size?: "sm" | "md" | "lg"
  stickyFirstColumn?: boolean
  stickyHeader?: boolean
  variant?: "line" | "outline" | "striped"
  width?: AdminTableWidth
}

type AdminTableCaptionProps = ComponentPropsWithoutRef<"caption"> & {
  ref?: RefObject<HTMLTableCaptionElement>
}

type AdminTableSectionProps = ComponentPropsWithoutRef<
  "thead" | "tbody" | "tfoot"
> & {
  ref?: RefObject<HTMLTableSectionElement>
}

type AdminTableRowProps = ComponentPropsWithoutRef<"tr"> & {
  ref?: RefObject<HTMLTableRowElement>
  selected?: boolean
}

type AdminTableCellProps = ComponentPropsWithoutRef<"td"> & {
  numeric?: boolean
  ref?: RefObject<HTMLTableCellElement>
}

type AdminTableColumnHeaderProps = ComponentPropsWithoutRef<"th"> & {
  numeric?: boolean
  ref?: RefObject<HTMLTableCellElement>
}

type AdminTableComponent = ((props: AdminTableRootProps) => ReactNode) & {
  Body: (props: AdminTableSectionProps) => ReactNode
  Caption: (props: AdminTableCaptionProps) => ReactNode
  Cell: (props: AdminTableCellProps) => ReactNode
  ColumnHeader: (props: AdminTableColumnHeaderProps) => ReactNode
  Footer: (props: AdminTableSectionProps) => ReactNode
  Header: (props: AdminTableSectionProps) => ReactNode
  Row: (props: AdminTableRowProps) => ReactNode
}

const widthClassName: Record<AdminTableWidth, string> = {
  "2xl": "min-w-2xl",
  "3xl": "min-w-3xl",
  xl: "min-w-xl",
}

function AdminTableRoot({
  children,
  className,
  size = "sm",
  variant = "line",
  width = "3xl",
  ...props
}: AdminTableRootProps) {
  return (
    <div className="overflow-x-auto">
      <Table
        className={cx(widthClassName[width], className)}
        size={size}
        variant={variant}
        {...props}
      >
        {children}
      </Table>
    </div>
  )
}

export const AdminTable: AdminTableComponent = Object.assign(AdminTableRoot, {
  Body: Table.Body,
  Caption: Table.Caption,
  Cell: Table.Cell,
  ColumnHeader: Table.ColumnHeader,
  Footer: Table.Footer,
  Header: Table.Header,
  Row: Table.Row,
})
