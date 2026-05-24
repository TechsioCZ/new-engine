import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Table } from "@techsio/ui-kit/organisms/table"
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  downloadPacketaLabels,
  PACKETA_LABEL_ORDER_LIST_LIMIT,
  usePacketaLabelOrders,
} from "./admin-api"
import type { PacketaLabelOrder, PacketaOrderFulfillment } from "./admin-types"
import {
  AdminPage,
  AdminPageCount,
  AdminPageHeader,
} from "./components/admin-page-header"
import { AdminPagination } from "./components/admin-pagination"
import { AdminPanel } from "./components/admin-panel"
import { AdminPanelHeader } from "./components/admin-panel-header"
import {
  AdminSelectField,
  type AdminSelectFieldItem,
} from "./components/admin-select-field"
import { AdminState } from "./components/admin-state"
import { AdminToolbarButton } from "./components/admin-toolbar-button"
import { readOffset } from "./utils/format"

type LabelFormat = "A6" | "A7"
type Feedback = {
  message: string
  tone: "error" | "success"
} | null

const LABEL_FORMATS: LabelFormat[] = ["A6", "A7"]
const LABEL_OFFSETS = [0, 1, 2, 3]
const LABEL_FORMAT_ITEMS: AdminSelectFieldItem[] = LABEL_FORMATS.map(
  (format) => ({
    label: format,
    value: format,
  })
)
const LABEL_OFFSET_ITEMS: AdminSelectFieldItem[] = LABEL_OFFSETS.map(
  (offset) => ({
    label: String(offset),
    value: String(offset),
  })
)

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
    <AdminPage>
      <AdminPageHeader eyebrow="Packeta" title="Stitky k objednavkam">
        <AdminPageCount
          label="vybrano"
          value={selectedPrintableOrderIds.length}
        />
      </AdminPageHeader>
      <AdminPanel as="div">
        <AdminPanelHeader
          actions={
            <PacketaLabelControls
              isDownloading={isDownloading}
              labelFormat={labelFormat}
              labelOffset={labelOffset}
              onDownload={handleDownload}
              onLabelFormatChange={setLabelFormat}
              onLabelOffsetChange={setLabelOffset}
              selectedCount={selectedPrintableOrderIds.length}
            />
          }
          stacked
          subtitle={`${orders.data?.count ?? 0} objednavek podle posledni aktivity`}
          title="Objednavky s Packetou"
        />
        {feedback && (
          <StatusText
            align="start"
            className="mx-300 mb-300"
            role={feedback.tone === "error" ? "alert" : "status"}
            showIcon
            size="sm"
            status={feedback.tone}
          >
            {feedback.message}
          </StatusText>
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
      </AdminPanel>
    </AdminPage>
  )
}

function PacketaLabelControls({
  isDownloading,
  labelFormat,
  labelOffset,
  onDownload,
  onLabelFormatChange,
  onLabelOffsetChange,
  selectedCount,
}: {
  isDownloading: boolean
  labelFormat: LabelFormat
  labelOffset: number
  onDownload: () => void
  onLabelFormatChange: (value: LabelFormat) => void
  onLabelOffsetChange: (value: number) => void
  selectedCount: number
}) {
  return (
    <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-end">
      <AdminSelectField
        className="sm:w-24"
        items={LABEL_FORMAT_ITEMS}
        label="Format"
        onValueChange={(value) => onLabelFormatChange(value as LabelFormat)}
        value={labelFormat}
      />
      <AdminSelectField
        className="sm:w-24"
        items={LABEL_OFFSET_ITEMS}
        label="Offset"
        onValueChange={(value) => onLabelOffsetChange(Number(value))}
        value={String(labelOffset)}
      />
      <AdminToolbarButton
        disabled={selectedCount === 0 || isDownloading}
        onClick={onDownload}
      >
        {isDownloading ? "Generuji..." : "Stahnout PDF"}
      </AdminToolbarButton>
    </div>
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
    return <AdminState isBusy>Nacitam objednavky...</AdminState>
  }

  if (isError) {
    return (
      <AdminState tone="error">
        Objednavky pro Packeta stitky se nepodarilo nacist.
      </AdminState>
    )
  }

  if (!orders.length) {
    return <AdminState>Zadne objednavky k zobrazeni.</AdminState>
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-3xl" size="sm" variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader className="w-1">
              <Checkbox
                aria-label="Vybrat vsechny tisknutelne objednavky na strance"
                checked={allPrintableSelected}
                onChange={onTogglePrintablePage}
              />
            </Table.ColumnHeader>
            <Table.ColumnHeader>Objednavka</Table.ColumnHeader>
            <Table.ColumnHeader>Email</Table.ColumnHeader>
            <Table.ColumnHeader>Vytvoreno</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Packeta</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {orders.map((order) => {
            const labels = getPacketaLabels(order)
            const canPrint = labels.length > 0

            return (
              <Table.Row
                key={order.id}
                selected={selectedOrderIds.has(order.id)}
              >
                <Table.Cell className="w-1">
                  <Checkbox
                    aria-label={`Vybrat ${formatOrderNumber(order)}`}
                    checked={selectedOrderIds.has(order.id)}
                    disabled={!canPrint}
                    onChange={() => onToggleOrder(order.id)}
                  />
                </Table.Cell>
                <Table.Cell className="font-semibold text-fg-primary">
                  {formatOrderNumber(order)}
                </Table.Cell>
                <Table.Cell className="max-w-xs truncate">
                  {order.email ?? "-"}
                </Table.Cell>
                <Table.Cell>{formatDate(order.created_at)}</Table.Cell>
                <Table.Cell>{order.fulfillment_status ?? "-"}</Table.Cell>
                <Table.Cell>
                  {canPrint ? (
                    <div className="flex flex-wrap gap-100">
                      {labels.map((label) => (
                        <Badge key={label.id} size="sm" variant="info">
                          {String(label.data?.barcode ?? label.data?.packet_id)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-fg-secondary">Bez stitku</span>
                  )}
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
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
