import type { Meta, StoryObj } from "@storybook/react"
import { useMemo, useState } from "react"
import { Button } from "../../src/atoms/button"
import { Dialog } from "../../src/molecules/dialog"
import { Toaster, useToast } from "../../src/molecules/toast"
import type { ColumnDef } from "../../src/organisms/data-table"
import { DataTable } from "../../src/organisms/data-table"
import {
  adminNav,
  type ContentEntry,
  contentEntries,
  contentStatusOptions,
  sectionOptions,
} from "./data"
import {
  AdminShell,
  BulkActionBar,
  EmptyState,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "./shell"

const meta: Meta = {
  /*
   * Business is the brand these back-office pages are designed against: it is the
   * light-only, high-contrast blue scale. Set at meta level so every page opens in
   * it; the Brand toolbar still switches the whole set to Default or Neo.
   */
  globals: { brand: "business", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/CMS/Content list",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "The archetypal back-office screen: persistent navigation, a page header that",
          "names the collection, and one DataTable that owns search, per-column filters,",
          "selection, row actions and paging.",
          "",
          "**Pattern rules**",
          "- One primary action per page (`New page`); everything else is secondary or",
          "  lives in the row action set.",
          "- Filtering belongs to the grid (`enableColumnFilters` + `meta.type`), not to a",
          "  hand-built filter bar — the controls then match the table size automatically.",
          "- Bulk actions appear only while a selection exists, so the toolbar never",
          "  reflows; destructive bulk actions are `variant=\"danger\"` and confirm in an",
          "  `alertdialog`.",
          "- Row density (`size`) is a page-level decision: `sm` for scanning lists,",
          "  `md` for lists you also edit inline.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

function useContentColumns(): ColumnDef<ContentEntry, unknown>[] {
  return useMemo(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        meta: { type: "string", width: 260 },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span className="font-medium">{info.getValue<string>()}</span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.slug}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "section",
        header: "Section",
        meta: { type: "enum", options: sectionOptions, width: 150 },
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { type: "enum", options: contentStatusOptions, width: 130 },
        cell: (info) => <StatusBadge status={info.getValue<string>()} />,
      },
      {
        accessorKey: "author",
        header: "Author",
        meta: { type: "string", width: 160 },
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        meta: { type: "date", width: 140 },
      },
      {
        accessorKey: "views",
        header: "Views",
        meta: { type: "int", align: "end", width: 140 },
        cell: (info) => info.getValue<number>().toLocaleString("en-GB"),
      },
    ],
    []
  )
}

function ContentListPage({
  rows,
  loading,
}: {
  rows: ContentEntry[]
  loading?: boolean
}) {
  const columns = useContentColumns()
  const toaster = useToast()
  const [nav, setNav] = useState("content-pages")
  const [selection, setSelection] = useState<Record<string, true>>({})
  const [pendingDelete, setPendingDelete] = useState<ContentEntry | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [data, setData] = useState(rows)

  const selectedIds = Object.keys(selection)
  const pageCount = (count: number) => `${count} ${count === 1 ? "page" : "pages"}`

  const applyBulk = (status: ContentEntry["status"], label: string) => {
    setData((current) =>
      current.map((row) =>
        selectedIds.includes(row.id) ? { ...row, status } : row
      )
    )
    toaster.create({
      type: "success",
      title: `${label} ${pageCount(selectedIds.length)}`,
    })
    setSelection({})
  }

  const confirmBulkDelete = () => {
    const count = selectedIds.length
    setData((current) => current.filter((row) => !selectedIds.includes(row.id)))
    toaster.create({ type: "success", title: `Deleted ${pageCount(count)}` })
    setSelection({})
    setBulkDeleting(false)
  }

  const confirmDelete = () => {
    if (!pendingDelete) {
      return
    }
    setData((current) => current.filter((row) => row.id !== pendingDelete.id))
    toaster.create({
      type: "success",
      title: "Page deleted",
      description: `“${pendingDelete.title}” was moved to the bin.`,
    })
    setPendingDelete(null)
  }

  return (
    <AdminShell
      defaultExpandedNav={["content"]}
      nav={adminNav}
      onNavChange={setNav}
      selectedNav={nav}
    >
      <Toaster />

      <PageHeader
        actions={
          <>
            <Button
              icon="icon-[mdi--tray-arrow-down]"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Export
            </Button>
            <Button icon="icon-[mdi--plus]" size="sm" variant="primary">
              New page
            </Button>
          </>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Content", href: "#" },
          { label: "Pages" },
        ]}
        description="Every marketing, help-centre and legal page served by the storefront. Filter by section or state to narrow the list before editing."
        title="Pages"
      />

      <BulkActionBar count={selectedIds.length} onClear={() => setSelection({})}>
        <Button
          icon="icon-[mdi--publish]"
          onClick={() => applyBulk("published", "Published")}
          size="sm"
          theme="outlined"
          variant="secondary"
        >
          Publish
        </Button>
        <Button
          icon="icon-[mdi--archive-outline]"
          onClick={() => applyBulk("archived", "Archived")}
          size="sm"
          theme="outlined"
          variant="secondary"
        >
          Archive
        </Button>
        <Button
          icon="icon-[mdi--delete-outline]"
          onClick={() => setBulkDeleting(true)}
          size="sm"
          theme="outlined"
          variant="danger"
        >
          Delete
        </Button>
      </BulkActionBar>

      <SectionCard flush>
        <DataTable
          columns={columns}
          data={data}
          enableColumnFilters
          enableColumnVisibility
          enableGlobalFilter
          enablePagination
          enableRowSelection
          enableSorting
          getRowId={(row) => row.id}
          getRowLabel={(row) => row.original.title}
          loading={loading}
          onRowSelectionChange={setSelection}
          pageSizeOptions={[10, 25, 50]}
          renderEmpty={() => (
            <EmptyState
              action={
                <Button icon="icon-[mdi--plus]" size="sm" variant="primary">
                  New page
                </Button>
              }
              description="No page matches the current filters. Clear a filter or create the first one."
              icon="icon-[mdi--file-document-outline]"
              title="No pages found"
            />
          )}
          rowActions={[
            {
              id: "edit",
              label: "Edit",
              icon: "icon-[mdi--pencil-outline]",
              onAction: (row) =>
                toaster.create({
                  type: "info",
                  title: "Opening editor",
                  description: row.original.title,
                }),
            },
            {
              id: "duplicate",
              label: "Duplicate",
              icon: "icon-[mdi--content-copy]",
              onAction: (row) =>
                toaster.create({
                  type: "success",
                  title: "Duplicated",
                  description: `${row.original.title} (copy)`,
                }),
            },
            {
              id: "delete",
              label: "Delete",
              icon: "icon-[mdi--delete-outline]",
              tone: "danger",
              disabled: (row) => row.original.status === "published",
              onAction: (row) => setPendingDelete(row.original),
            },
          ]}
          rowSelection={selection}
          size="sm"
          striped
          translations={{
            searchPlaceholder: "Search pages…",
            emptyTitle: "No pages found",
          }}
        />
      </SectionCard>

      {/* Bulk delete is destructive and irreversible, so it confirms too — and
          it names the count, because the selection is off-screen by then. */}
      <Dialog
        actions={
          <>
            <Button
              onClick={() => setBulkDeleting(false)}
              theme="outlined"
              variant="secondary"
            >
              Keep pages
            </Button>
            <Button onClick={confirmBulkDelete} variant="danger">
              {`Delete ${pageCount(selectedIds.length)}`}
            </Button>
          </>
        }
        customTrigger
        description={`${pageCount(selectedIds.length)} and ${selectedIds.length === 1 ? "its" : "their"} revision history will be removed. This cannot be undone.`}
        onOpenChange={(details) => setBulkDeleting(details.open)}
        open={bulkDeleting}
        role="alertdialog"
        size="sm"
        title={selectedIds.length === 1 ? "Delete this page?" : "Delete the selected pages?"}
      />

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setPendingDelete(null)}
              theme="outlined"
              variant="secondary"
            >
              Keep page
            </Button>
            <Button onClick={confirmDelete} variant="danger">
              Delete page
            </Button>
          </>
        }
        customTrigger
        description={
          pendingDelete
            ? `“${pendingDelete.title}” and its revision history will be removed. This cannot be undone.`
            : undefined
        }
        onOpenChange={(details) => {
          if (!details.open) {
            setPendingDelete(null)
          }
        }}
        open={pendingDelete !== null}
        role="alertdialog"
        size="sm"
        title="Delete this page?"
      />
    </AdminShell>
  )
}

export const Default: Story = {
  render: () => <ContentListPage rows={contentEntries} />,
}

export const Loading: Story = {
  name: "Loading skeleton",
  parameters: {
    docs: {
      description: {
        story:
          "`loading` keeps the header and chrome in place and swaps the body for skeleton rows, so the page does not jump when the first response lands.",
      },
    },
  },
  render: () => <ContentListPage loading rows={[]} />,
}

export const Empty: Story = {
  name: "Empty collection",
  parameters: {
    docs: {
      description: {
        story:
          "`renderEmpty` replaces the body — not the toolbar — so search and filters stay reachable and the user can undo whatever emptied the list.",
      },
    },
  },
  render: () => <ContentListPage rows={[]} />,
}
