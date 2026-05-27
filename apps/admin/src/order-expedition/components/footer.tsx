import { AdminToolbarButton } from "../../components/admin-toolbar-button"

export function OrderDashboardPagination({
  canNextPage,
  canPreviousPage,
  onNextPage,
  onPreviousPage,
  pageIndex,
}: {
  canNextPage: boolean
  canPreviousPage: boolean
  onNextPage: () => void
  onPreviousPage: () => void
  pageIndex: number
}) {
  return (
    <>
      <span className="text-fg-secondary text-sm">Strana {pageIndex + 1}</span>
      <div className="flex items-center gap-200">
        <AdminToolbarButton
          disabled={!canPreviousPage}
          onClick={onPreviousPage}
        >
          Predchozi
        </AdminToolbarButton>
        <AdminToolbarButton disabled={!canNextPage} onClick={onNextPage}>
          Dalsi
        </AdminToolbarButton>
      </div>
    </>
  )
}
