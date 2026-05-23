import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  downloadPacketaLabels,
  PACKETA_LABEL_ORDER_LIST_LIMIT,
  usePacketaLabelOrders,
} from "./admin-api"
import type { PacketaLabelOrder, PacketaOrderFulfillment } from "./admin-types"
import { AdminPagination } from "./components/admin-pagination"

type LabelFormat = "A6" | "A7"
type Feedback = {
  message: string
  tone: "error" | "success"
} | null

const LABEL_FORMATS: LabelFormat[] = ["A6", "A7"]
const LABEL_OFFSETS = [0, 1, 2, 3]

export function PacketaLabelsPage() {
  const [searchParams] = useSearchParams()
  const offset = readOffset(searchParams.get("offset"))
  const [labelFormat, setLabelFormat] = useState<LabelFormat>("A6")
  const [labelOffset, setLabelOffset] = useState(0)
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    new Set()
  )
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const orders = usePacketaLabelOrders({ offset })

  const currentOrders = orders.data?.orders ?? []
  const printableOrderIds = useMemo(
    () =>
      currentOrders
        .filter((order) => getPacketaLabels(order).length > 0)
        .map((order) => order.id),
    [currentOrders]
  )
  const selectedPrintableOrderIds = [...selectedOrderIds].filter((orderId) =>
    printableOrderIds.includes(orderId)
  )
  const allPrintableSelected =
    printableOrderIds.length > 0 &&
    printableOrderIds.every((orderId) => selectedOrderIds.has(orderId))

  function toggleOrder(orderId: string) {
    setSelectedOrderIds((current) => {
      const next = new Set(current)

      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }

      return next
    })
    setFeedback(null)
  }

  function togglePrintablePage() {
    setSelectedOrderIds((current) => {
      const next = new Set(current)

      if (allPrintableSelected) {
        for (const orderId of printableOrderIds) {
          next.delete(orderId)
        }
      } else {
        for (const orderId of printableOrderIds) {
          next.add(orderId)
        }
      }

      return next
    })
    setFeedback(null)
  }

  async function handleDownload() {
    if (!selectedPrintableOrderIds.length) {
      return
    }

    setIsDownloading(true)
    setFeedback(null)

    try {
      const blob = await downloadPacketaLabels({
        labelFormat,
        labelOffset,
        orderIds: selectedPrintableOrderIds,
      })
      downloadBlob(
        blob,
        `packeta-labels-${new Date().toISOString().slice(0, 10)}.pdf`
      )
      setFeedback({
        message: "Packeta stitky byly vygenerovane.",
        tone: "success",
      })
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Packeta stitky se nepodarilo vygenerovat.",
        tone: "error",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Packeta</span>
          <h1>Stitky k objednavkam</h1>
        </div>
        <div className="admin-page-count">
          <span>{selectedPrintableOrderIds.length}</span>
          <small>vybrano</small>
        </div>
      </header>
      <div className="admin-panel">
        <div className="admin-panel-header admin-panel-header-stacked">
          <div>
            <h2>Objednavky s Packetou</h2>
            <span>
              {orders.data?.count ?? 0} objednavek podle posledni aktivity
            </span>
          </div>
          <div className="admin-packeta-actions">
            <label className="admin-compact-field">
              <span>Format</span>
              <select
                onChange={(event) =>
                  setLabelFormat(event.target.value as LabelFormat)
                }
                value={labelFormat}
              >
                {LABEL_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-compact-field">
              <span>Offset</span>
              <select
                onChange={(event) => setLabelOffset(Number(event.target.value))}
                value={labelOffset}
              >
                {LABEL_OFFSETS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <Button
              className="admin-toolbar-button"
              disabled={!selectedPrintableOrderIds.length || isDownloading}
              onClick={handleDownload}
              size="sm"
              theme="outlined"
              type="button"
              variant="secondary"
            >
              {isDownloading ? "Generuji..." : "Stahnout PDF"}
            </Button>
          </div>
        </div>
        {feedback && (
          <div
            className={[
              "admin-feedback",
              feedback.tone === "error" ? "admin-feedback-error" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {feedback.message}
          </div>
        )}
        <PacketaOrdersTable
          allPrintableSelected={allPrintableSelected}
          isError={orders.isError}
          isLoading={orders.isLoading}
          onToggleOrder={toggleOrder}
          onTogglePrintablePage={togglePrintablePage}
          orders={currentOrders}
          selectedOrderIds={selectedOrderIds}
        />
        {orders.data && (
          <AdminPagination
            ariaLabel="Strankovani Packeta objednavek"
            className="border-border-primary border-t px-8 py-6"
            count={orders.data.count}
            offset={orders.data.offset}
            onPageChange={() => setFeedback(null)}
            pageSize={PACKETA_LABEL_ORDER_LIST_LIMIT}
          />
        )}
      </div>
    </section>
  )
}

function PacketaOrdersTable({
  allPrintableSelected,
  isError,
  isLoading,
  onToggleOrder,
  onTogglePrintablePage,
  orders,
  selectedOrderIds,
}: {
  allPrintableSelected: boolean
  isError: boolean
  isLoading: boolean
  onToggleOrder: (orderId: string) => void
  onTogglePrintablePage: () => void
  orders: PacketaLabelOrder[]
  selectedOrderIds: Set<string>
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="admin-table-state">
        Nacitam objednavky...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="admin-table-state admin-table-state-error">
        Objednavky pro Packeta stitky se nepodarilo nacist.
      </div>
    )
  }

  if (!orders.length) {
    return (
      <div className="admin-table-state">Zadne objednavky k zobrazeni.</div>
    )
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th className="admin-table-check">
              <input
                aria-label="Vybrat vsechny tisknutelne objednavky na strance"
                checked={allPrintableSelected}
                onChange={onTogglePrintablePage}
                type="checkbox"
              />
            </th>
            <th>Objednavka</th>
            <th>Email</th>
            <th>Vytvoreno</th>
            <th>Status</th>
            <th>Packeta</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const labels = getPacketaLabels(order)
            const canPrint = labels.length > 0

            return (
              <tr key={order.id}>
                <td className="admin-table-check">
                  <input
                    aria-label={`Vybrat ${formatOrderNumber(order)}`}
                    checked={selectedOrderIds.has(order.id)}
                    disabled={!canPrint}
                    onChange={() => onToggleOrder(order.id)}
                    type="checkbox"
                  />
                </td>
                <td className="admin-table-strong">
                  {formatOrderNumber(order)}
                </td>
                <td className="admin-table-truncate">{order.email ?? "-"}</td>
                <td>{formatDate(order.created_at)}</td>
                <td>{order.fulfillment_status ?? "-"}</td>
                <td>
                  {canPrint ? (
                    <div className="admin-chip-row">
                      {labels.map((label) => (
                        <Badge
                          className="admin-status-badge"
                          key={label.id}
                          size="sm"
                          variant="info"
                        >
                          {String(label.data?.barcode ?? label.data?.packet_id)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="admin-muted">Bez stitku</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function getPacketaLabels(order: PacketaLabelOrder): PacketaOrderFulfillment[] {
  return order.fulfillments.filter(
    (fulfillment) =>
      fulfillment.provider_id === "packeta_packeta" &&
      !fulfillment.canceled_at &&
      typeof fulfillment.data?.packet_id === "number"
  )
}

function formatOrderNumber(order: PacketaLabelOrder) {
  return (
    order.custom_display_id ??
    (order.display_id ? `#${order.display_id}` : order.id)
  )
}

function formatDate(value: string | null) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "medium",
  }).format(date)
}

function readOffset(value: string | null) {
  const offset = Number(value)

  if (!Number.isFinite(offset) || offset <= 0) {
    return 0
  }

  return Math.floor(offset)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
