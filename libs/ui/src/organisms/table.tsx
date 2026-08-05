/**
 * Table — @techsio/ui-kit organism.
 *
 * @component Table
 * @componentVersion v1.0.0
 * @skill table-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the table-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { createContext, useContext } from "react"
import type { ComponentPropsWithoutRef, RefObject } from "react"
import type { VariantProps } from "tailwind-variants"

import { tv } from "../utils"

const tableVariants = tv({
  defaultVariants: {
    captionPlacement: "top",
    interactive: false,
    showColumnBorder: false,
    size: "md",
    stickyFirstColumn: false,
    stickyHeader: false,
    variant: "line",
  },
  slots: {
    body: "",
    caption: ["text-table-caption-fg", "text-start font-table-caption"],
    cell: ["text-start data-[numeric=true]:text-end"],
    columnHeader: [
      "text-start data-[numeric=true]:text-end",
      "font-table-header",
    ],
    footer: ["bg-table-footer-bg", "font-table-footer text-table-footer-fg"],
    header: ["bg-table-header-bg", "font-table-header text-table-header-fg"],
    root: ["w-full border-collapse", "bg-table-bg text-table-fg"],
    row: [
      "border-b-(length:--border-table-width) border-table-border",
      "data-[selected=true]:bg-table-row-bg-selected",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
  },
  variants: {
    captionPlacement: {
      bottom: {
        caption: "caption-bottom",
      },
      top: {
        caption: "caption-top",
      },
    },
    interactive: {
      true: {
        row: "cursor-pointer hover:bg-table-row-bg-hover",
      },
    },
    showColumnBorder: {
      true: {
        cell: "border-r-(length:--border-table-width) border-table-border",
        columnHeader:
          "border-r-(length:--border-table-width) border-table-border",
      },
    },
    size: {
      lg: {
        caption: "p-table-caption-lg text-table-caption-lg",
        cell: "p-table-cell-lg text-table-lg",
        columnHeader: "p-table-cell-lg text-table-lg",
      },
      md: {
        caption: "p-table-caption-md text-table-caption-md",
        cell: "p-table-cell-md text-table-md",
        columnHeader: "p-table-cell-md text-table-md",
      },
      sm: {
        caption: "p-table-caption-sm text-table-caption-sm",
        cell: "p-table-cell-sm text-table-sm",
        columnHeader: "p-table-cell-sm text-table-sm",
      },
    },
    stickyFirstColumn: {
      true: {
        cell: ["first:sticky first:start-0 first:z-10", "bg-table-bg"],
        columnHeader: [
          "first:sticky first:start-0 first:z-20",
          "bg-table-header-bg",
        ],
      },
    },
    stickyHeader: {
      true: {
        columnHeader: "sticky top-0 z-10 bg-table-header-bg",
      },
    },
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
  },
})

// Context for sharing state between sub-components
interface TableContextValue {
  variant?: "line" | "outline" | "striped" | undefined
  size?: "sm" | "md" | "lg" | undefined
  interactive?: boolean | undefined
  stickyHeader?: boolean | undefined
  stickyFirstColumn?: boolean | undefined
  showColumnBorder?: boolean | undefined
  captionPlacement?: "top" | "bottom" | undefined
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
  extends
    VariantProps<typeof tableVariants>,
    ComponentPropsWithoutRef<"table"> {
  ref?: RefObject<HTMLTableElement> | undefined
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
    captionPlacement,
    interactive,
    showColumnBorder,
    size,
    stickyFirstColumn,
    stickyHeader,
    variant,
  })

  return (
    <TableContext.Provider
      value={{
        captionPlacement,
        interactive,
        showColumnBorder,
        size,
        stickyFirstColumn,
        stickyHeader,
        styles,
        variant,
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
  ref?: RefObject<HTMLTableCaptionElement> | undefined
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
  ref?: RefObject<HTMLTableSectionElement> | undefined
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
  ref?: RefObject<HTMLTableSectionElement> | undefined
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
  ref?: RefObject<HTMLTableSectionElement> | undefined
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
  ref?: RefObject<HTMLTableRowElement> | undefined
  selected?: boolean | undefined
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
  ref?: RefObject<HTMLTableCellElement> | undefined
  numeric?: boolean | undefined
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
  ref?: RefObject<HTMLTableCellElement> | undefined
  numeric?: boolean | undefined
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
