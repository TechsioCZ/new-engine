/**
 * Table — @techsio/ui-kit organism.
 *
 * @component Table
 * @componentVersion v1.1.0
 * @skill table-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the table-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  Children,
  type ComponentPropsWithoutRef,
  createContext,
  isValidElement,
  type ReactNode,
  type RefObject,
  useContext,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Button, type ButtonProps } from "../atoms/button"
import { SearchForm } from "../molecules/search-form"
import { tv } from "../utils"

const tableVariants = tv({
  slots: {
    root: ["w-full border-collapse", "bg-table-bg text-table-fg"],
    // A <table> cannot contain a toolbar, so when one is composed the root
    // renders inside this wrapper and the toolbar docks above the header.
    container: "w-full",
    // Header, toolbar and footer are the table's chrome — one shared surface
    // color (--color-table-section) so they read as a single unit.
    toolbar: [
      "flex flex-wrap items-center justify-between gap-table-toolbar",
      "bg-table-section-bg",
    ],
    toolbarSearch: "min-w-0 flex-1",
    toolbarActions: "flex shrink-0 items-center gap-table-toolbar",
    caption: ["text-table-caption-fg", "text-start font-table-caption"],
    header: ["bg-table-section-bg", "font-table-header text-table-header-fg"],
    body: "",
    footer: ["bg-table-section-bg", "font-table-footer text-table-footer-fg"],
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
        toolbar: "p-table-cell-sm",
      },
      md: {
        cell: "p-table-cell-md text-table-md",
        columnHeader: "p-table-cell-md text-table-md",
        caption: "p-table-caption-md text-table-caption-md",
        toolbar: "p-table-cell-md",
      },
      lg: {
        cell: "p-table-cell-lg text-table-lg",
        columnHeader: "p-table-cell-lg text-table-lg",
        caption: "p-table-caption-lg text-table-caption-lg",
        toolbar: "p-table-cell-lg",
      },
    },
    stickyHeader: {
      true: {
        columnHeader: "sticky top-0 z-10 bg-table-section-bg",
      },
    },
    stickyFirstColumn: {
      true: {
        columnHeader: [
          "first:sticky first:start-0 first:z-20",
          "bg-table-section-bg",
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
    // Set internally when a Table.Toolbar is composed — not a public prop.
    withToolbar: {
      true: {},
    },
  },
  compoundVariants: [
    {
      // With a toolbar the outline chrome moves to the wrapper so one border
      // wraps toolbar and table together instead of cutting between them.
      variant: "outline",
      withToolbar: true,
      className: {
        container:
          "border-(length:--border-table-width) rounded-table border-table-border shadow-table-outline",
        root: "rounded-none border-0 shadow-none",
        toolbar: "rounded-t-table",
      },
    },
  ],
  defaultVariants: {
    variant: "line",
    size: "md",
    interactive: false,
    stickyHeader: false,
    stickyFirstColumn: false,
    showColumnBorder: false,
    captionPlacement: "top",
    withToolbar: false,
  },
})

// Context for sharing state between sub-components
type TableContextValue = {
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
  extends Omit<VariantProps<typeof tableVariants>, "withToolbar">,
    ComponentPropsWithoutRef<"table"> {
  ref?: RefObject<HTMLTableElement>
}

// A <table> element cannot contain a toolbar, so Table.Toolbar children are
// lifted out and docked above the <table> inside a shared wrapper. Direct
// children only — a toolbar nested in a fragment or component stays put.
const isToolbarChild = (child: ReactNode) =>
  isValidElement(child) && child.type === Table.Toolbar

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
  const childArray = Children.toArray(children)
  const toolbar = childArray.filter(isToolbarChild)
  const tableChildren = childArray.filter((child) => !isToolbarChild(child))
  const withToolbar = toolbar.length > 0

  const styles = tableVariants({
    variant,
    size,
    interactive,
    stickyHeader,
    stickyFirstColumn,
    showColumnBorder,
    captionPlacement,
    withToolbar,
  })

  const table = (
    <table className={styles.root({ className })} ref={ref} {...props}>
      {tableChildren}
    </table>
  )

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
      {withToolbar ? (
        <div className={styles.container()}>
          {toolbar}
          {table}
        </div>
      ) : (
        table
      )}
    </TableContext.Provider>
  )
}

// Toolbar component — the table's header bar. Full-text search on the left,
// custom actions (an array of Button configs, any Button props) on the right.
// Shares the section surface color with Table.Header/Table.Footer so it reads
// as part of the data table.
export type TableToolbarAction = ButtonProps

interface TableToolbarProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  ref?: RefObject<HTMLDivElement>
  /** Action buttons rendered on the right, in order. Any Button props work. */
  actions?: TableToolbarAction[]
  /** Hide the search field when the toolbar only carries actions. */
  search?: boolean
  searchPlaceholder?: string
  /** Accessible label of the search input. */
  searchLabel?: string
  /** Controlled search value. */
  searchValue?: string
  defaultSearchValue?: string
  /** Fires on every keystroke — wire the full-text row filtering here. */
  onSearchChange?: (value: string) => void
}

Table.Toolbar = function TableToolbar({
  actions,
  search = true,
  searchPlaceholder,
  searchLabel = "Search table",
  searchValue,
  defaultSearchValue,
  onSearchChange,
  children,
  ref,
  className,
  ...props
}: TableToolbarProps) {
  const { styles, size } = useTableContext()

  return (
    <div className={styles.toolbar({ className })} ref={ref} {...props}>
      {search && (
        <SearchForm
          className={styles.toolbarSearch()}
          defaultValue={defaultSearchValue}
          gapped
          onValueChange={onSearchChange}
          size={size}
          value={searchValue}
        >
          <SearchForm.Input
            aria-label={searchLabel}
            placeholder={searchPlaceholder}
          />
          <SearchForm.ClearButton />
        </SearchForm>
      )}
      {children}
      {actions && actions.length > 0 && (
        <div className={styles.toolbarActions()}>
          {actions.map((action, index) => (
            <Button key={action.id ?? index} size={size} {...action} />
          ))}
        </div>
      )}
    </div>
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
