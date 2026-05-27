import type { ReactNode } from "react"
import type {
  OrderExpeditionBlockingOrder,
  OrderExpeditionOrder,
} from "../../admin-types"
import { AdminState } from "../../components/admin-state"

export function OrderDashboardMessages({
  blockingOrders,
  notice,
}: {
  blockingOrders: OrderExpeditionBlockingOrder[]
  notice: string | null
}) {
  return (
    <>
      {notice ? (
        <div className="border-border-primary border-b p-400">
          <AdminState>{notice}</AdminState>
        </div>
      ) : null}

      {blockingOrders.length ? (
        <BlockingOrders orders={blockingOrders} />
      ) : null}
    </>
  )
}

function BlockingOrders({
  orders,
}: {
  orders: OrderExpeditionBlockingOrder[]
}) {
  return (
    <div className="grid gap-200 border-border-primary border-b bg-fill-base p-400">
      <div className="font-medium text-danger">
        Nektere objednavky nesly aktualizovat.
      </div>
      <div className="grid gap-100 text-fg-secondary text-sm">
        {orders.map((order) => (
          <div key={`${order.id}-${order.reason}`}>
            {order.order_display_id}: {order.reason}
          </div>
        ))}
      </div>
    </div>
  )
}

export function BulkManualStatusPreview({
  label,
  preview,
}: {
  label: string
  preview: {
    skipped: OrderExpeditionBlockingOrder[]
    updatable: OrderExpeditionOrder[]
  }
}) {
  return (
    <div className="grid max-h-[var(--spacing-80)] gap-300 overflow-auto text-sm">
      <div>
        Cilovy status: <span className="font-medium">{label}</span>
      </div>
      <div>
        {preview.updatable.length} objednavek se aktualizuje.{" "}
        {preview.skipped.length} objednavek bude preskoceno.
      </div>
      <PreviewList title="Bude aktualizovano">
        {preview.updatable.slice(0, 10).map((order) => (
          <div key={order.id}>
            {order.order_display_id}: {label}
          </div>
        ))}
      </PreviewList>
      {preview.skipped.length ? (
        <PreviewList title="Preskoceno">
          {preview.skipped.slice(0, 10).map((order) => (
            <div key={`${order.id}-${order.reason}`}>
              {order.order_display_id}: {order.reason}
            </div>
          ))}
        </PreviewList>
      ) : null}
    </div>
  )
}

export function MedusaStatusPreview({
  label,
  orders,
}: {
  label: string
  orders: OrderExpeditionOrder[]
}) {
  return (
    <div className="grid max-h-[var(--spacing-80)] gap-300 overflow-auto text-sm">
      <div>
        Cilovy Medusa status: <span className="font-medium">{label}</span>
      </div>
      <div>{orders.length} objednavek se aktualizuje.</div>
      <PreviewList title="Bude aktualizovano">
        {orders.slice(0, 10).map((order) => (
          <div key={order.id}>
            {order.order_display_id}: {label}
          </div>
        ))}
      </PreviewList>
    </div>
  )
}

function PreviewList({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <div className="grid gap-100 rounded-md border border-border-primary bg-fill-base p-300">
      <div className="font-medium">{title}</div>
      <div className="grid gap-100 text-fg-secondary">{children}</div>
    </div>
  )
}
