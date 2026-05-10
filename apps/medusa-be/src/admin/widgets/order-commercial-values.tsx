import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import type {
  CommercialDiscountIntent,
  CommercialValuesConfirmResponse as CommercialValuesConfirmPayload,
  CommercialValuesPreview,
  CommercialValuesSnapshot,
} from "../../utils/order-commercial-values"
import { sdk } from "../lib/sdk"

type CommercialValuesSnapshotResponse = {
  commercial_values: CommercialValuesSnapshot
}

type CommercialValuesPreviewResponse = {
  preview: CommercialValuesPreview
}

type CommercialValuesConfirmResponse = {
  commercial_values: CommercialValuesConfirmPayload
}

type DraftDiscountType = "none" | "percentage" | "amount"

type DraftItem = {
  discount_type: DraftDiscountType
  discount_value: string
  item_id: string
  unit_price: string
}

type DraftState = {
  internal_note: string
  items: DraftItem[]
  order_discount_type: DraftDiscountType
  order_discount_value: string
}

type CommercialValuesWidgetProps = Partial<DetailWidgetProps<AdminOrder>>
type CommercialValuesPayload = NonNullable<ReturnType<typeof buildPayload>>
type CommercialValuesPreviewVariables = {
  key: string
  payload: CommercialValuesPayload
}

const QUERY_KEY_PREFIX = "order-commercial-values"
const MANUAL_ITEM_DISCOUNT_CODE = "manual_item_discount"
const MANUAL_ORDER_DISCOUNT_CODE = "manual_order_discount"
const ITEM_INITIALS_SEPARATOR = /\s+/
const DRAWER_CONTENT_STYLE = {
  maxWidth: "min(1040px, calc(100vw - 32px))",
  width: "min(1040px, calc(100vw - 32px))",
} satisfies CSSProperties

function isDraftDiscountType(value: string): value is DraftDiscountType {
  return value === "none" || value === "percentage" || value === "amount"
}

function invalidateMedusaAdminOrderQueries(
  queryClient: QueryClient,
  orderId: string
) {
  const orderDetailQueryKey = ["orders", "detail", orderId] as const

  queryClient.invalidateQueries({ queryKey: ["orders"] })
  queryClient.invalidateQueries({ queryKey: orderDetailQueryKey })
  // Medusa dashboard derives preview/change/line-item keys from a nested detail key.
  queryClient.invalidateQueries({ queryKey: [orderDetailQueryKey] })
}

function formatMoney(value: number | undefined, currencyCode: string) {
  if (value === undefined || !Number.isFinite(value)) {
    return "-"
  }

  return new Intl.NumberFormat("cs-CZ", {
    currency: currencyCode.toUpperCase(),
    style: "currency",
  }).format(value)
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("cs-CZ", {
    maximumFractionDigits: 3,
  }).format(value)
}

function getItemDisplayName(item: CommercialValuesSnapshot["items"][number]) {
  const variantTitle =
    item.variant_title && item.product_title !== item.variant_title
      ? item.variant_title
      : undefined

  return (
    item.title ||
    [item.product_title, variantTitle].filter(Boolean).join(" / ") ||
    item.product_title ||
    "Order item"
  )
}

function getItemMetadata(item: CommercialValuesSnapshot["items"][number]) {
  return [item.subtitle, item.variant_sku ? `SKU ${item.variant_sku}` : null]
    .filter(Boolean)
    .join(" · ")
}

function getItemInitials(item: CommercialValuesSnapshot["items"][number]) {
  const initials = getItemDisplayName(item)
    .split(ITEM_INITIALS_SEPARATOR)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return initials || "IT"
}

function getDraftLineTotal(item: DraftItem, quantity: number) {
  const unitPrice = parseAmount(item.unit_price)

  return unitPrice === undefined ? undefined : unitPrice * quantity
}

function getManualAdjustmentAmount(
  item: CommercialValuesSnapshot["items"][number],
  code: string
) {
  return item.existing_adjustments
    .filter((adjustment) => adjustment.code === code)
    .reduce((total, adjustment) => total + adjustment.amount, 0)
}

function createDraft(snapshot: CommercialValuesSnapshot): DraftState {
  const orderDiscountAmount = snapshot.items.reduce(
    (total, item) =>
      total + getManualAdjustmentAmount(item, MANUAL_ORDER_DISCOUNT_CODE),
    0
  )

  return {
    internal_note: "",
    items: snapshot.items.map((item) => {
      const itemDiscountAmount = getManualAdjustmentAmount(
        item,
        MANUAL_ITEM_DISCOUNT_CODE
      )

      return {
        discount_type: itemDiscountAmount > 0 ? "amount" : "none",
        discount_value:
          itemDiscountAmount > 0 ? String(itemDiscountAmount) : "",
        item_id: item.item_id,
        unit_price: String(item.unit_price),
      }
    }),
    order_discount_type: orderDiscountAmount > 0 ? "amount" : "none",
    order_discount_value:
      orderDiscountAmount > 0 ? String(orderDiscountAmount) : "",
  }
}

function parseAmount(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return
  }

  const parsed = Number(trimmed)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return
  }

  return parsed
}

function parseDiscount(
  type: DraftDiscountType,
  value: string
): CommercialDiscountIntent | null | undefined {
  if (type === "none") {
    return null
  }

  const parsed = parseAmount(value)
  if (parsed === undefined) {
    return
  }

  if (type === "percentage") {
    if (parsed > 100) {
      return
    }

    return {
      type: "percentage",
      value_bps: Math.round(parsed * 100),
    }
  }

  return {
    amount: parsed,
    type: "amount",
  }
}

function buildPayload(
  draft: DraftState,
  snapshot: CommercialValuesSnapshot,
  confirmationMode?: "confirm" | "request"
) {
  const items = draft.items.map((item) => ({
    discount: parseDiscount(item.discount_type, item.discount_value),
    item_id: item.item_id,
    unit_price: parseAmount(item.unit_price),
  }))

  if (
    items.some(
      (item, index) =>
        item.unit_price === undefined ||
        item.discount === undefined ||
        (draft.items[index]?.discount_type !== "none" &&
          draft.items[index]?.discount_value.trim() === "")
    )
  ) {
    return
  }

  const orderDiscount = parseDiscount(
    draft.order_discount_type,
    draft.order_discount_value
  )
  if (
    orderDiscount === undefined ||
    (draft.order_discount_type !== "none" &&
      draft.order_discount_value.trim() === "")
  ) {
    return
  }

  const payload = {
    expected_order_version: snapshot.expected_order_version,
    internal_note: draft.internal_note.trim() || undefined,
    items: items.map((item) => ({
      discount: item.discount,
      item_id: item.item_id,
      unit_price: item.unit_price as number,
    })),
    order_discount: orderDiscount,
  }

  return confirmationMode
    ? {
        ...payload,
        confirmation_mode: confirmationMode,
      }
    : payload
}

function getItemPreview(
  preview: CommercialValuesPreview | undefined,
  itemId: string
) {
  return preview?.items.find((item) => item.item_id === itemId)
}

function getPreviewPayloadKey(payload: CommercialValuesPayload) {
  return stableStringify(payload)
}

function stableStringify(value: unknown) {
  return JSON.stringify(toStableJsonValue(value))
}

function toStableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(toStableJsonValue)
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, toStableJsonValue(entry)])
    )
  }

  return value
}

const DiscountControls = ({
  className = "",
  disabled,
  onTypeChange,
  onValueChange,
  type,
  value,
}: {
  className?: string
  disabled?: boolean
  onTypeChange: (value: DraftDiscountType) => void
  onValueChange: (value: string) => void
  type: DraftDiscountType
  value: string
}) => (
  <div
    className={`grid min-w-0 grid-cols-[116px_minmax(96px,1fr)] items-center gap-2 ${className}`}
  >
    <Select
      disabled={disabled}
      onValueChange={(next) => {
        if (isDraftDiscountType(next)) {
          onTypeChange(next)
        }
      }}
      value={type}
    >
      <Select.Trigger className="w-full">
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="none">None</Select.Item>
        <Select.Item value="percentage">%</Select.Item>
        <Select.Item value="amount">Amount</Select.Item>
      </Select.Content>
    </Select>
    <Input
      disabled={disabled || type === "none"}
      min={0}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={type === "percentage" ? "0-100" : "0"}
      step="any"
      type="number"
      value={type === "none" ? "" : value}
    />
  </div>
)

const CommercialValuesDrawer = ({
  draft,
  isOpen,
  isPreviewing,
  isSaving,
  onClose,
  onConfirm,
  onDraftChange,
  onPreview,
  preview,
  snapshot,
}: {
  draft: DraftState
  isOpen: boolean
  isPreviewing: boolean
  isSaving: boolean
  onClose: () => void
  onConfirm: () => void
  onDraftChange: (draft: DraftState) => void
  onPreview: () => void
  preview?: CommercialValuesPreview
  snapshot: CommercialValuesSnapshot
}) => {
  const payload = buildPayload(draft, snapshot, "confirm")
  const canSubmit = snapshot.editable && !!payload

  const updateItem = (itemId: string, patch: Partial<DraftItem>) => {
    onDraftChange({
      ...draft,
      items: draft.items.map((item) =>
        item.item_id === itemId ? { ...item, ...patch } : item
      ),
    })
  }

  return (
    <Drawer onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <Drawer.Content style={DRAWER_CONTENT_STYLE}>
        <Drawer.Header>
          <Drawer.Title>Commercial values</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-5 overflow-y-auto bg-ui-bg-subtle pb-24">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4">
              <Text className="text-ui-fg-subtle" size="small">
                Original total
              </Text>
              <Text className="mt-1 text-ui-fg-base" weight="plus">
                {formatMoney(
                  snapshot.totals.original_total,
                  snapshot.currency_code
                )}
              </Text>
            </div>
            <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4">
              <Text className="text-ui-fg-subtle" size="small">
                New total
              </Text>
              <Text className="mt-1 text-ui-fg-base" weight="plus">
                {formatMoney(
                  preview?.new_total ?? snapshot.totals.current_total,
                  snapshot.currency_code
                )}
              </Text>
            </div>
            <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4">
              <Text className="text-ui-fg-subtle" size="small">
                Delta
              </Text>
              <Text
                className={
                  preview?.delta && preview.delta < 0
                    ? "mt-1 text-ui-fg-interactive"
                    : "mt-1 text-ui-fg-base"
                }
                weight="plus"
              >
                {formatMoney(preview?.delta ?? 0, snapshot.currency_code)}
              </Text>
            </div>
          </div>

          {snapshot.edit_blockers.length > 0 ? (
            <div className="rounded-md border border-ui-border-base p-3">
              {snapshot.edit_blockers.map((blocker) => (
                <Text className="text-ui-fg-error" key={blocker} size="small">
                  {blocker}
                </Text>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            {snapshot.items.map((item) => {
              const draftItem = draft.items.find(
                (candidate) => candidate.item_id === item.item_id
              )
              const itemPreview = getItemPreview(preview, item.item_id)
              const metadata = getItemMetadata(item)

              if (!draftItem) {
                return null
              }

              return (
                <div
                  className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4 shadow-elevation-card-rest"
                  key={item.item_id}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 items-start gap-3 md:max-w-[560px]">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-subtle">
                        <Text size="small" weight="plus">
                          {getItemInitials(item)}
                        </Text>
                      </div>
                      <div className="min-w-0">
                        <Text
                          className="truncate text-ui-fg-base"
                          weight="plus"
                        >
                          {getItemDisplayName(item)}
                        </Text>
                        {metadata ? (
                          <Text
                            className="mt-0.5 truncate text-ui-fg-subtle"
                            size="small"
                          >
                            {metadata}
                          </Text>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-3 sm:min-w-[260px]">
                      <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
                        <Text className="text-ui-fg-subtle" size="small">
                          Qty
                        </Text>
                        <Text className="mt-1" weight="plus">
                          {formatQuantity(item.quantity)}
                        </Text>
                      </div>
                      <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2 sm:text-right">
                        <Text className="text-ui-fg-subtle" size="small">
                          Line
                        </Text>
                        <Text className="mt-1" weight="plus">
                          {formatMoney(
                            itemPreview?.final_line_total ??
                              getDraftLineTotal(draftItem, item.quantity),
                            snapshot.currency_code
                          )}
                        </Text>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 border-ui-border-base border-t pt-4 md:grid-cols-[180px_minmax(0,1fr)]">
                    <div>
                      <Text className="mb-2 text-ui-fg-subtle" size="small">
                        Unit price
                      </Text>
                      <Input
                        disabled={!snapshot.editable}
                        min={0}
                        onChange={(event) =>
                          updateItem(item.item_id, {
                            unit_price: event.target.value,
                          })
                        }
                        step="any"
                        type="number"
                        value={draftItem.unit_price}
                      />
                    </div>

                    <div className="md:max-w-[420px]">
                      <Text className="mb-2 text-ui-fg-subtle" size="small">
                        Item discount
                      </Text>
                      <DiscountControls
                        disabled={!snapshot.editable}
                        onTypeChange={(discountType) =>
                          updateItem(item.item_id, {
                            discount_type: discountType,
                            discount_value:
                              discountType === "none"
                                ? ""
                                : draftItem.discount_value,
                          })
                        }
                        onValueChange={(discountValue) =>
                          updateItem(item.item_id, {
                            discount_value: discountValue,
                          })
                        }
                        type={draftItem.discount_type}
                        value={draftItem.discount_value}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid gap-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-4 md:grid-cols-[minmax(0,1fr)_160px]">
            <div>
              <Text className="mb-2 text-ui-fg-subtle" size="small">
                Order discount
              </Text>
              <DiscountControls
                className="max-w-[360px]"
                disabled={!snapshot.editable}
                onTypeChange={(discountType) =>
                  onDraftChange({
                    ...draft,
                    order_discount_type: discountType,
                    order_discount_value:
                      discountType === "none" ? "" : draft.order_discount_value,
                  })
                }
                onValueChange={(discountValue) =>
                  onDraftChange({
                    ...draft,
                    order_discount_value: discountValue,
                  })
                }
                type={draft.order_discount_type}
                value={draft.order_discount_value}
              />
            </div>
            <div className="md:text-right">
              <Text className="text-ui-fg-subtle" size="small">
                Order discount total
              </Text>
              <Text className="mt-1" weight="plus">
                {formatMoney(
                  preview?.order_discount_total ?? 0,
                  snapshot.currency_code
                )}
              </Text>
            </div>
          </div>

          <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4">
            <Text className="mb-2 text-ui-fg-subtle" size="small">
              Internal note
            </Text>
            <Input
              disabled={!snapshot.editable}
              onChange={(event) =>
                onDraftChange({ ...draft, internal_note: event.target.value })
              }
              value={draft.internal_note}
            />
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex w-full items-center justify-end gap-2">
            <Button onClick={onClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={!canSubmit}
              isLoading={isPreviewing}
              onClick={onPreview}
              type="button"
              variant="secondary"
            >
              Preview
            </Button>
            <Button
              disabled={!(canSubmit && preview)}
              isLoading={isSaving}
              onClick={onConfirm}
              type="button"
            >
              Confirm
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const CommercialValuesWidget = ({ data }: CommercialValuesWidgetProps) => {
  const order = data
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [preview, setPreview] = useState<CommercialValuesPreview>()
  const latestPreviewKey = useRef<string | undefined>(undefined)

  const queryKey = useMemo(() => [QUERY_KEY_PREFIX, order?.id], [order?.id])

  const {
    data: snapshotData,
    error,
    isLoading,
  } = useQuery({
    enabled: !!order?.id,
    queryFn: () =>
      sdk.client.fetch<CommercialValuesSnapshotResponse>(
        `/admin/orders/${order?.id}/commercial-values`
      ),
    queryKey,
  })

  const snapshot = snapshotData?.commercial_values

  useEffect(() => {
    if (snapshot) {
      setDraft(createDraft(snapshot))
      setPreview(undefined)
      latestPreviewKey.current = undefined
    }
  }, [snapshot])

  const previewMutation = useMutation({
    mutationFn: ({ payload }: CommercialValuesPreviewVariables) =>
      sdk.client.fetch<CommercialValuesPreviewResponse>(
        `/admin/orders/${order?.id}/commercial-values/preview`,
        {
          body: payload,
          method: "POST",
        }
      ),
    onError: (err, variables) => {
      if (latestPreviewKey.current !== variables.key) {
        return
      }

      toast.error(err instanceof Error ? err.message : "Preview failed")
    },
    onSuccess: (response, variables) => {
      if (latestPreviewKey.current !== variables.key) {
        return
      }

      setPreview(response.preview)
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (payload: CommercialValuesPayload) =>
      sdk.client.fetch<CommercialValuesConfirmResponse>(
        `/admin/orders/${order?.id}/commercial-values/confirm`,
        {
          body: payload,
          method: "POST",
        }
      ),
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Save failed")
    },
    onSuccess: (response) => {
      toast.success(
        response.commercial_values.mode === "requested"
          ? "Order edit requested"
          : "Order edit confirmed"
      )
      setIsOpen(false)
      setPreview(undefined)
      queryClient.invalidateQueries({ queryKey })
      if (order?.id) {
        invalidateMedusaAdminOrderQueries(queryClient, order.id)
      }
    },
  })

  if (!order?.id) {
    return null
  }

  const openForm = () => {
    if (snapshot) {
      setDraft(createDraft(snapshot))
      setPreview(undefined)
      latestPreviewKey.current = undefined
    }
    setIsOpen(true)
  }

  const runPreview = () => {
    if (!(draft && snapshot)) {
      return
    }

    const payload = buildPayload(draft, snapshot)
    if (!payload) {
      toast.error("Invalid commercial values")
      return
    }

    const key = getPreviewPayloadKey(payload)
    latestPreviewKey.current = key
    previewMutation.mutate({ key, payload })
  }

  const runConfirm = () => {
    if (!(draft && snapshot)) {
      return
    }

    const payload = buildPayload(draft, snapshot, "confirm")
    if (!payload) {
      toast.error("Invalid commercial values")
      return
    }

    confirmMutation.mutate(payload)
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div>
          <Heading level="h2">Commercial values</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {snapshot
              ? formatMoney(
                  snapshot.totals.current_total,
                  snapshot.currency_code
                )
              : "Loading..."}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          {snapshot && !snapshot.editable ? (
            <Badge size="2xsmall">Locked</Badge>
          ) : null}
          <Button
            disabled={isLoading || !!error || !snapshot}
            onClick={openForm}
            size="small"
            type="button"
            variant="secondary"
          >
            Edit
          </Button>
        </div>
      </div>
      {error ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error" size="small">
            Failed to load commercial values.
          </Text>
        </div>
      ) : null}
      {snapshot && draft ? (
        <CommercialValuesDrawer
          draft={draft}
          isOpen={isOpen}
          isPreviewing={previewMutation.isPending}
          isSaving={confirmMutation.isPending}
          onClose={() => setIsOpen(false)}
          onConfirm={runConfirm}
          onDraftChange={(nextDraft) => {
            setDraft(nextDraft)
            setPreview(undefined)
            latestPreviewKey.current = undefined
          }}
          onPreview={runPreview}
          preview={preview}
          snapshot={snapshot}
        />
      ) : null}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default CommercialValuesWidget
