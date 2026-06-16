import {
  type ComponentPropsWithoutRef,
  createContext,
  type RefObject,
  useContext,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"

const tableVariants = tv({
  slots: {
    root: ["w-full border-collapse", "bg-table-bg text-table-fg"],
    caption: ["text-table-caption-fg", "text-start font-table-caption"],
    header: ["bg-table-header-bg", "font-table-header text-table-header-fg"],
    body: "",
    footer: ["bg-table-footer-bg", "font-table-footer text-table-footer-fg"],
    row: [
      "border-b-(length:--border-table-width) border-table-border",
      "data-[selected=true]:bg-table-row-bg-selected",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    columnHeader: [
      "text-start data-[numeric=true]:text-end",
      "font-table-header",
    ],
    cell: ["text-start data-[numeric=true]:text-end"],
  },
  variants: {
    variant: {
      line: {
        root: "",
        row: "border-b-(length:--border-table-width) border-table-border",
      },
      outline: {
        root: "border-(length:--border-table-width) rounded-table border-table-border shadow-table-outline",
      },
      striped: {
        row: "odd:bg-table-row-striped-primary even:bg-table-row-striped-secondary",
      },
    },
    interactive: {
      true: {
        row: "cursor-pointer hover:bg-table-row-bg-hover",
      },
    },
    size: {
      sm: {
        cell: "p-table-cell-sm text-table-sm",
        columnHeader: "p-table-cell-sm text-table-sm",
        caption: "p-table-caption-sm text-table-caption-sm",
      },
      md: {
        cell: "p-table-cell-md text-table-md",
        columnHeader: "p-table-cell-md text-table-md",
        caption: "p-table-caption-md text-table-caption-md",
      },
      lg: {
        cell: "p-table-cell-lg text-table-lg",
        columnHeader: "p-table-cell-lg text-table-lg",
        caption: "p-table-caption-lg text-table-caption-lg",
      },
    },
    stickyHeader: {
      true: {
        columnHeader: "sticky top-0 z-10 bg-table-header-bg",
      },
    },
    stickyFirstColumn: {
      true: {
        columnHeader: [
          "first:sticky first:start-0 first:z-20",
          "bg-table-header-bg",
        ],
        cell: ["first:sticky first:start-0 first:z-10", "bg-table-bg"],
      },
    },
    showColumnBorder: {
      true: {
        columnHeader:
          "border-r-(length:--border-table-width) border-table-border",
        cell: "border-r-(length:--border-table-width) border-table-border",
      },
    },
    captionPlacement: {
      top: {
        caption: "caption-top",
      },
      bottom: {
        caption: "caption-bottom",
      },
    },
  },
  defaultVariants: {
    variant: "line",
    size: "md",
    interactive: false,
    stickyHeader: false,
    stickyFirstColumn: false,
    showColumnBorder: false,
    captionPlacement: "top",
  },
})

// Context for sharing state between sub-components
interface TableContextValue {
  variant?: "line" | "outline" | "striped"
  size?: "sm" | "md" | "lg"
  interactive?: boolean
  stickyHeader?: boolean
  stickyFirstColumn?: boolean
  showColumnBorder?: boolean
  captionPlacement?: "top" | "bottom"
  styles: ReturnType<typeof tableVariants>
}

const TableContext = createContext<TableContextValue | null>(null)

function useTableContext() {
  const context = useContext(TableContext)
  if (!context) {
    throw new Error("Table components must be used within Table")
  }
  return context
}

// Root component
interface TableProps
  extends VariantProps<typeof tableVariants>,
    ComponentPropsWithoutRef<"table"> {
  ref?: RefObject<HTMLTableElement>
}

export function Table({
  variant,
  size,
  interactive,
  stickyHeader,
  stickyFirstColumn,
  showColumnBorder,
  captionPlacement,
  children,
  ref,
  className,
  ...props
}: TableProps) {
  const styles = tableVariants({
    variant,
    size,
    interactive,
    stickyHeader,
    stickyFirstColumn,
    showColumnBorder,
    captionPlacement,
  })

  return (
    <TableContext.Provider
      value={{
        variant,
        size,
        interactive,
        stickyHeader,
        stickyFirstColumn,
        showColumnBorder,
        captionPlacement,
        styles,
      }}
    >
      <table className={styles.root({ className })} ref={ref} {...props}>
        {children}
      </table>
    </TableContext.Provider>
  )
}

// Caption component
interface TableCaptionProps extends ComponentPropsWithoutRef<"caption"> {
  ref?: RefObject<HTMLTableCaptionElement>
}

Table.Caption = function TableCaption({
  children,
  ref,
  className,
  ...props
}: TableCaptionProps) {
  const { styles } = useTableContext()

  return (
    <caption className={styles.caption({ className })} ref={ref} {...props}>
      {children}
    </caption>
  )
}

// Header component
interface TableHeaderProps extends ComponentPropsWithoutRef<"thead"> {
  ref?: RefObject<HTMLTableSectionElement>
}

Table.Header = function TableHeader({
  children,
  ref,
  className,
  ...props
}: TableHeaderProps) {
  const { styles } = useTableContext()

  return (
    <thead className={styles.header({ className })} ref={ref} {...props}>
      {children}
    </thead>
  )
}

// Body component
interface TableBodyProps extends ComponentPropsWithoutRef<"tbody"> {
  ref?: RefObject<HTMLTableSectionElement>
}

Table.Body = function TableBody({
  children,
  ref,
  className,
  ...props
}: TableBodyProps) {
  const { styles } = useTableContext()

  return (
    <tbody className={styles.body({ className })} ref={ref} {...props}>
      {children}
    </tbody>
  )
}

// Footer component
interface TableFooterProps extends ComponentPropsWithoutRef<"tfoot"> {
  ref?: RefObject<HTMLTableSectionElement>
}

Table.Footer = function TableFooter({
  children,
  ref,
  className,
  ...props
}: TableFooterProps) {
  const { styles } = useTableContext()

  return (
    <tfoot className={styles.footer({ className })} ref={ref} {...props}>
      {children}
    </tfoot>
  )
}

// Row component
interface TableRowProps extends ComponentPropsWithoutRef<"tr"> {
  ref?: RefObject<HTMLTableRowElement>
  selected?: boolean
}

Table.Row = function TableRow({
  children,
  ref,
  className,
  selected,
  ...props
}: TableRowProps) {
  const { styles } = useTableContext()

  return (
    <tr
      className={styles.row({ className })}
      data-selected={selected}
      ref={ref}
      {...props}
    >
      {children}
    </tr>
  )
}

// ColumnHeader component
interface TableColumnHeaderProps extends ComponentPropsWithoutRef<"th"> {
  ref?: RefObject<HTMLTableCellElement>
  numeric?: boolean
}

Table.ColumnHeader = function TableColumnHeader({
  children,
  ref,
  className,
  numeric,
  ...props
}: TableColumnHeaderProps) {
  const { styles } = useTableContext()

  return (
    <th
      className={styles.columnHeader({ className })}
      data-numeric={numeric}
      ref={ref}
      scope="col"
      {...props}
    >
      {children}
    </th>
  )
}

// Cell component
interface TableCellProps extends ComponentPropsWithoutRef<"td"> {
  ref?: RefObject<HTMLTableCellElement>
  numeric?: boolean
}

Table.Cell = function TableCell({
  children,
  ref,
  className,
  numeric,
  ...props
}: TableCellProps) {
  const { styles, stickyFirstColumn } = useTableContext()

  return (
    <td
      className={styles.cell({ className, stickyFirstColumn })}
      data-numeric={numeric}
      ref={ref}
      {...props}
    >
      {children}
    </td>
  )
}

// Display name
Table.displayName = "Table"
