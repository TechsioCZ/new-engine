import { CommandBar, clx, Table } from "@medusajs/ui"
import { flexRender } from "@tanstack/react-table"
import type { Cell, Table as ReactTable, Row } from "@tanstack/react-table"
import { Fragment, useEffect, useRef, useState } from "react"
import type { ComponentPropsWithoutRef, UIEvent } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { NoResults } from "../empty-state"

interface TableColumnIdentifier {
  id?: string | undefined
}

interface BulkCommand {
  label: string
  shortcut: string
  action: (selection: Record<string, boolean>) => Promise<void>
}

interface BodyCellProps<TData> {
  cell: Cell<TData, unknown>
  cells: Cell<TData, unknown>[]
  index: number
  presentation: {
    hasSelect: boolean
    isOdd: boolean
    isRowDisabled: boolean
    showStickyBorder: boolean
  }
  rowDepth: number
  to?: string
}

export interface DataTableRootProps<TData> {
  /**
   * The table instance to render
   */
  table: ReactTable<TData>
  /**
   * The columns to render
   */
  columns: TableColumnIdentifier[]
  /**
   * Function to generate a link to navigate to when clicking on a row
   */
  navigateTo?: ((row: Row<TData>) => string) | undefined
  /**
   * Bulk actions to render
   */
  commands?: BulkCommand[] | undefined
  /**
   * The total number of items in the table
   */
  count?: number | undefined
  /**
   * Whether to display pagination controls
   */
  pagination?: boolean | undefined
  /**
   * Whether the table is empty due to no results from the active query
   */
  noResults?: boolean
  /**
   * Whether to display the tables header
   */
  noHeader?: boolean
  /**
   * The layout of the table
   */
  layout?: "fill" | "fit"
}

const getFirstContentCellIndex = <TData,>(cells: Cell<TData, unknown>[]) =>
  cells.findIndex((cell) => cell.column.id !== "select")

const getIsFirstContentCell = <TData,>(
  cell: Cell<TData, unknown>,
  cells: Cell<TData, unknown>[],
  index: number,
) => {
  const firstCell = getFirstContentCellIndex(cells)

  if (firstCell === -1) {
    return index === 0
  }

  return cell.column.id === cells[firstCell]?.column.id
}

const getDepthOffset = (rowDepth: number, isFirstCell: boolean) =>
  rowDepth > 0 && isFirstCell ? rowDepth * 14 + 24 : undefined

const BodyCell = <TData,>({
  cell,
  cells,
  index,
  presentation,
  rowDepth,
  to,
}: BodyCellProps<TData>) => {
  const { hasSelect, isOdd, isRowDisabled, showStickyBorder } = presentation
  const isSelectCell = cell.column.id === "select"
  const isFirstCell = getIsFirstContentCell(cell, cells, index)
  const isStickyCell = isSelectCell || isFirstCell
  const depthOffset = getDepthOffset(rowDepth, isFirstCell)
  const hasLeftOffset = isStickyCell && hasSelect && !isSelectCell
  const inner = flexRender(cell.column.columnDef.cell, cell.getContext())
  const hasLink = to !== undefined && to.length > 0
  const isTabableLink = isFirstCell && hasLink
  const shouldRenderAsLink = hasLink && !isSelectCell

  return (
    <Table.Cell
      className={clx({
        "!bg-ui-bg-disabled !hover:bg-ui-bg-disabled": isRowDisabled,
        "!pl-0 !pr-0": shouldRenderAsLink,
        "after:bg-ui-border-base":
          showStickyBorder && isStickyCell && !isSelectCell,
        "bg-ui-bg-subtle group-hover/row:bg-ui-bg-subtle-hover":
          isOdd && isStickyCell,
        "left-[68px]": hasLeftOffset,
        "sticky left-0 bg-ui-bg-base transition-fg after:absolute after:inset-y-0 after:right-0 after:h-full after:w-px after:bg-transparent after:content-[''] group-hover/row:bg-ui-bg-base-hover group-has-[[data-row-link]:focus-visible]:bg-ui-bg-base-hover group-data-[selected=true]/row:bg-ui-bg-highlight group-data-[selected=true]/row:group-hover/row:bg-ui-bg-highlight-hover":
          isStickyCell,
      })}
      style={{
        paddingLeft: depthOffset === undefined ? undefined : `${depthOffset}px`,
      }}
    >
      {shouldRenderAsLink ? (
        <Link
          className="size-full outline-none"
          data-row-link
          tabIndex={isTabableLink ? 0 : -1}
          to={to}
        >
          <div
            className={clx("flex size-full items-center pr-6", {
              "pl-6": isTabableLink && !hasLeftOffset,
            })}
          >
            {inner}
          </div>
        </Link>
      ) : (
        inner
      )}
    </Table.Cell>
  )
}

type PaginationProps = Omit<
  ComponentPropsWithoutRef<typeof Table.Pagination>,
  "translations"
>

const Pagination = (props: PaginationProps) => {
  const { t } = useTranslation()

  const translations = {
    next: t("general.next"),
    of: t("general.of"),
    pages: t("general.pages"),
    prev: t("general.prev"),
    results: t("general.results"),
  }

  return (
    <Table.Pagination
      className="flex-shrink-0"
      {...props}
      translations={translations}
    />
  )
}

/**
 * Future enhancement: add a sticky header to the table that shows the column name when scrolling through the table vertically.
 *
 * This is a bit tricky as we can't support horizontal scrolling and sticky headers at the same time, natively
 * with CSS. We need to implement a custom solution for this. One solution is to render a duplicate table header
 * using a DIV that, but it will require rerendeing the duplicate header every time the window is resized, to keep
 * the columns aligned.
 */

/**
 * Table component for rendering a table with pagination, filtering and ordering.
 */
export const DataTableRoot = <TData,>({
  table,
  columns,
  pagination,
  navigateTo,
  commands,
  count = 0,
  noResults = false,
  noHeader = false,
  layout = "fit",
}: DataTableRootProps<TData>) => {
  const { t } = useTranslation()
  const [showStickyBorder, setShowStickyBorder] = useState(false)

  const scrollableRef = useRef<HTMLDivElement>(null)

  const hasSelect = columns.some((column) => column.id === "select")
  const hasActions = columns.some((column) => column.id === "actions")
  const hasCommandBar = commands !== undefined && commands.length > 0

  const { rowSelection } = table.getState()
  const { pageIndex, pageSize } = table.getState().pagination

  const colCount = columns.length - (hasSelect ? 1 : 0) - (hasActions ? 1 : 0)
  const colWidth = 100 / colCount

  const handleHorizontalScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollLeft } = e.currentTarget

    if (scrollLeft > 0) {
      setShowStickyBorder(true)
    } else {
      setShowStickyBorder(false)
    }
  }

  const handleAction = async (action: BulkCommand["action"]) => {
    await action(rowSelection)
    table.resetRowSelection()
  }

  useEffect(() => {
    if (pageIndex >= 0) {
      scrollableRef.current?.scroll({ left: 0, top: 0 })
    }
  }, [pageIndex])

  return (
    <div
      className={clx("flex w-full flex-col overflow-hidden", {
        "flex flex-1 flex-col": layout === "fill",
      })}
    >
      <div
        className={clx("w-full", {
          "min-h-0 flex-grow overflow-auto": layout === "fill",
          "overflow-x-auto": layout === "fit",
        })}
        onScroll={handleHorizontalScroll}
        ref={scrollableRef}
      >
        {noResults ? (
          <div className={clx({ "border-b": layout === "fit" })}>
            <NoResults />
          </div>
        ) : (
          <Table className="relative w-full">
            {!noHeader && (
              <Table.Header className="border-t-0">
                {table.getHeaderGroups().map((headerGroup) => (
                  <Table.Row
                    className={clx({
                      "[&_th:first-of-type]:w-[1%] [&_th:first-of-type]:whitespace-nowrap":
                        hasSelect,
                      "relative border-b-0 [&_th:last-of-type]:w-[1%] [&_th:last-of-type]:whitespace-nowrap":
                        hasActions,
                    })}
                    key={headerGroup.id}
                  >
                    {headerGroup.headers.map((header, index) => {
                      const isActionHeader = header.id === "actions"
                      const isSelectHeader = header.id === "select"
                      const isSpecialHeader = isActionHeader || isSelectHeader

                      const firstHeader = headerGroup.headers.findIndex(
                        (h) => h.id !== "select",
                      )
                      const isFirstHeader =
                        firstHeader === -1
                          ? index === 0
                          : header.id === headerGroup.headers[firstHeader]?.id

                      const isStickyHeader = isSelectHeader || isFirstHeader

                      return (
                        <Table.HeaderCell
                          className={clx({
                            "after:bg-ui-border-base":
                              showStickyBorder &&
                              isStickyHeader &&
                              !isSpecialHeader,
                            "left-[68px]":
                              isStickyHeader && hasSelect && !isSelectHeader,
                            "sticky left-0 bg-ui-bg-base after:absolute after:inset-y-0 after:right-0 after:h-full after:w-px after:bg-transparent after:content-['']":
                              isStickyHeader,
                          })}
                          data-table-header-id={header.id}
                          key={header.id}
                          style={{
                            width: isSpecialHeader ? undefined : `${colWidth}%`,
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </Table.HeaderCell>
                      )
                    })}
                  </Table.Row>
                ))}
              </Table.Header>
            )}
            <Table.Body className="border-b-0">
              {table.getRowModel().rows.map((row) => {
                const to =
                  navigateTo === undefined ? undefined : navigateTo(row)
                const isRowDisabled = hasSelect && !row.getCanSelect()

                const isOdd = row.depth % 2 !== 0

                const cells = row.getVisibleCells()

                return (
                  <Table.Row
                    className={clx(
                      "group/row group relative transition-fg [&_td:last-of-type]:w-[1%] [&_td:last-of-type]:whitespace-nowrap",
                      "has-[[data-row-link]:focus-visible]:bg-ui-bg-base-hover",
                      {
                        "!bg-ui-bg-disabled !hover:bg-ui-bg-disabled":
                          isRowDisabled,
                        "bg-ui-bg-highlight hover:bg-ui-bg-highlight-hover":
                          row.getIsSelected(),
                        "bg-ui-bg-subtle hover:bg-ui-bg-subtle-hover": isOdd,
                        "cursor-pointer": to !== undefined && to.length > 0,
                      },
                    )}
                    data-selected={row.getIsSelected()}
                    key={row.id}
                  >
                    {cells.map((cell, index) => (
                      <BodyCell
                        cell={cell}
                        cells={cells}
                        index={index}
                        key={cell.id}
                        presentation={{
                          hasSelect,
                          isOdd,
                          isRowDisabled,
                          showStickyBorder,
                        }}
                        rowDepth={row.depth}
                        {...(to !== undefined && to.length > 0 ? { to } : {})}
                      />
                    ))}
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        )}
      </div>
      {pagination === true && (
        <div className={clx({ "border-t": layout === "fill" })}>
          <Pagination
            canNextPage={table.getCanNextPage()}
            canPreviousPage={table.getCanPreviousPage()}
            count={count}
            nextPage={table.nextPage}
            pageCount={table.getPageCount()}
            pageIndex={pageIndex}
            pageSize={pageSize}
            previousPage={table.previousPage}
          />
        </div>
      )}
      {hasCommandBar && (
        <CommandBar open={Object.keys(rowSelection).length > 0}>
          <CommandBar.Bar>
            <CommandBar.Value>
              {t("general.countSelected", {
                count: Object.keys(rowSelection).length,
              })}
            </CommandBar.Value>
            <CommandBar.Seperator />
            {commands?.map((command, index) => (
              <Fragment key={`${command.label}-${command.shortcut}`}>
                <CommandBar.Command
                  action={async () => {
                    await handleAction(command.action)
                  }}
                  label={command.label}
                  shortcut={command.shortcut}
                />
                {index < commands.length - 1 && <CommandBar.Seperator />}
              </Fragment>
            ))}
          </CommandBar.Bar>
        </CommandBar>
      )}
    </div>
  )
}
