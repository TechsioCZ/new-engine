/**
 * Akros-specific layer on top of the generic `Pages/*` shell.
 *
 * Still no new design-system components: the frame is `AdminShell`, the
 * badges are `Badge`, the notices are `Icon` + `Button` in a bordered row.
 * What lives here is the *vocabulary* every Akros screen shares — how an
 * order state, a payment state, an ABRA transfer and a pickup point look —
 * so the orders list, the order detail and the dashboard tell one story.
 */
import type { ReactNode } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Icon, type IconType } from "../../../src/atoms/icon"
import { Tooltip } from "../../../src/atoms/tooltip"
import { AdminShell } from "../shell"
import {
  type AbraState,
  akrosNav,
  type Carrier,
  type OrderState,
  type PaymentMethod,
  type PaymentState,
} from "./data"

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "secondary"
  | "outline"

/**
 * Akros back-office frame. Pages pass the nav id they represent; the shell
 * keeps navigation, global search and account in the same place everywhere.
 */
export function AkrosShell({
  selected,
  expanded,
  children,
}: {
  selected: string
  /** Nav branches to open on first render. */
  expanded?: string[]
  children: ReactNode
}) {
  return (
    <AdminShell
      defaultExpandedNav={expanded}
      environment="Back office"
      nav={akrosNav}
      selectedNav={selected}
      workspace="Akros"
    >
      {children}
    </AdminShell>
  )
}

/* --------------------------------------------------------------- badges --- */

const orderStates: Record<OrderState, [string, BadgeVariant]> = {
  new: ["New", "info"],
  processing: ["Processing", "warning"],
  ready: ["Ready to ship", "info"],
  shipped: ["Shipped", "secondary"],
  delivered: ["Delivered", "success"],
  cancelled: ["Cancelled", "outline"],
}

export function OrderStateBadge({ state }: { state: OrderState }) {
  const [label, variant] = orderStates[state]
  return (
    <Badge size="sm" variant={variant}>
      {label}
    </Badge>
  )
}

const paymentStates: Record<PaymentState, [string, BadgeVariant]> = {
  paid: ["Paid", "success"],
  unpaid: ["Unpaid", "warning"],
  pending: ["Awaiting gateway", "info"],
  failed: ["Payment failed", "danger"],
  refunded: ["Refunded", "outline"],
}

export function PaymentBadge({ state }: { state: PaymentState }) {
  const [label, variant] = paymentStates[state]
  return (
    <Badge size="sm" variant={variant}>
      {label}
    </Badge>
  )
}

const paymentShort: Record<PaymentMethod, string> = {
  comgate: "Comgate",
  transfer: "Bank transfer",
  cod: "Cash on delivery",
  invoice: "Invoice",
}

/**
 * Payment method + state in one cell. An unpaid online (Comgate) order is
 * the one operators hunt for, so it gets an explicit marker instead of
 * relying on the reader combining two columns in their head.
 */
export function PaymentCell({
  method,
  state,
}: {
  method: PaymentMethod
  state: PaymentState
}) {
  const unpaidOnline =
    method === "comgate" && (state === "unpaid" || state === "failed")

  return (
    <span className="flex flex-col items-start gap-50">
      <PaymentBadge state={state} />
      <span className="flex items-center gap-50 text-fg-secondary text-xs">
        {unpaidOnline && (
          <>
            <Icon
              color="danger"
              icon="icon-[mdi--credit-card-remove-outline]"
              size="sm"
            />
            <span className="sr-only">Online payment not completed ·</span>
          </>
        )}
        {paymentShort[method]}
      </span>
    </span>
  )
}

const abraStates: Record<AbraState, [string, BadgeVariant, IconType]> = {
  "not-sent": ["Not sent", "outline", "icon-[mdi--database-off-outline]"],
  queued: ["Queued", "info", "icon-[mdi--database-clock-outline]"],
  sent: ["In ABRA", "success", "icon-[mdi--database-check-outline]"],
  error: ["Transfer failed", "danger", "icon-[mdi--database-alert-outline]"],
}

/** ABRA transfer state; the ABRA document number shows once one exists. */
export function AbraBadge({
  state,
  document,
}: {
  state: AbraState
  document?: string
}) {
  const [label, variant, icon] = abraStates[state]

  return (
    <span className="flex flex-col items-start gap-50">
      <span className="flex items-center gap-50">
        <Icon className="text-fg-secondary" icon={icon} size="sm" />
        <Badge size="sm" variant={variant}>
          {label}
        </Badge>
      </span>
      {document && (
        <span className="text-fg-secondary text-xs">{document}</span>
      )}
    </span>
  )
}

const carrierIcons: Record<Carrier, IconType> = {
  Zásilkovna: "icon-[mdi--map-marker-radius-outline]",
  "PPL ParcelBox": "icon-[mdi--package-variant-closed-check]",
  PPL: "icon-[mdi--truck-delivery-outline]",
  Balíkovna: "icon-[mdi--map-marker-radius-outline]",
  "Personal pickup": "icon-[mdi--storefront-outline]",
}

/**
 * Carrier + pickup point. The point id is what support reads out on the
 * phone and what the carrier API needs, so it is always shown in full.
 */
export function ShippingCell({
  carrier,
  pointId,
  pointName,
}: {
  carrier: Carrier
  pointId?: string
  pointName?: string
}) {
  return (
    <span className="flex min-w-0 flex-col gap-50">
      <span className="flex items-center gap-50">
        <Icon icon={carrierIcons[carrier]} size="sm" />
        {carrier}
      </span>
      {pointId && (
        <span className="truncate text-fg-secondary text-xs">
          ID {pointId}
          {pointName ? ` · ${pointName}` : ""}
        </span>
      )}
    </span>
  )
}

/* -------------------------------------------------------------- notices --- */

type NoticeTone = "danger" | "warning" | "info" | "success"

const noticeIcons: Record<NoticeTone, IconType> = {
  danger: "icon-[mdi--alert-circle-outline]",
  warning: "icon-[mdi--alert-outline]",
  info: "icon-[mdi--information-outline]",
  success: "icon-[mdi--check-circle-outline]",
}

const noticeColors: Record<NoticeTone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
}

/**
 * A row that says what is wrong and offers the next step. Colour is never
 * the only signal: every tone has its own icon and the text states the fact.
 */
export function Notice({
  tone,
  title,
  children,
  action,
}: {
  tone: NoticeTone
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start gap-150 rounded-md border border-border-primary bg-surface p-150">
      <Icon className={noticeColors[tone]} icon={noticeIcons[tone]} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-50">
        <span className="font-medium text-sm">{title}</span>
        {children && (
          <div className="flex flex-col gap-100 text-fg-secondary text-sm">
            {children}
          </div>
        )}
      </div>
      {action && <div className="flex items-center gap-100">{action}</div>}
    </div>
  )
}

/**
 * Marks a field whose value is owned by ABRA. The CMS shows it but never
 * edits it — the badge tells the operator where to change it instead.
 */
export function AbraOwned() {
  return (
    <Tooltip content="Managed in ABRA — edit it there, the next import overwrites the CMS">
      <span className="inline-flex items-center gap-50 text-fg-secondary">
        <Icon icon="icon-[mdi--lock-outline]" size="sm" />
        <Badge size="sm" variant="outline">
          From ABRA
        </Badge>
      </span>
    </Tooltip>
  )
}

export const akrosDocs = (lines: string[]) => lines.join("\n")
