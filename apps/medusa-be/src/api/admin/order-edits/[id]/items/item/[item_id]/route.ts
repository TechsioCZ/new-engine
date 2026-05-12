import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  orderEditUpdateItemQuantityWorkflow,
  removeItemOrderEditActionWorkflow,
} from "@medusajs/medusa/core-flows"

type OrderEditItemUpdateBody = {
  compare_at_unit_price?: number | null
  internal_note?: string | null
  metadata?: Record<string, unknown> | null
  quantity: number
  unit_price?: number | null
}

type OrderPreviewItemAction = {
  action?: string | null
  id?: string | null
}

type OrderPreviewItem = {
  actions?: OrderPreviewItemAction[] | null
  detail?: {
    quantity?: number | string | null
    raw_quantity?: { value?: number | string | null } | null
  } | null
  id?: string | null
}

type OrderPreview = {
  items?: OrderPreviewItem[] | null
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return
  }

  const numberValue = typeof value === "string" ? Number(value) : value

  return Number.isFinite(numberValue) ? numberValue : undefined
}

function getOriginalQuantity(item: OrderPreviewItem) {
  return toNumber(item.detail?.quantity ?? item.detail?.raw_quantity?.value)
}

async function previewOrderChange(req: MedusaRequest, orderId: string) {
  const orderModuleService = req.scope.resolve(Modules.ORDER) as {
    previewOrderChange: (orderId: string) => Promise<OrderPreview>
  }

  return orderModuleService.previewOrderChange(orderId)
}

async function removeItemUpdateActions(
  req: MedusaRequest,
  orderId: string,
  actionIds: string[]
) {
  let orderPreview: unknown

  for (const actionId of actionIds) {
    const { result } = await removeItemOrderEditActionWorkflow(req.scope).run({
      input: {
        action_id: actionId,
        order_id: orderId,
      },
    })
    orderPreview = result
  }

  return orderPreview
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id, item_id: itemId } = req.params
  const body = req.validatedBody as OrderEditItemUpdateBody

  if (!(id && itemId)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Order edit id and item id are required"
    )
  }

  const preview = await previewOrderChange(req, id)
  const item = preview.items?.find((candidate) => candidate.id === itemId)
  const originalQuantity = item ? getOriginalQuantity(item) : undefined
  const itemUpdateActionIds =
    item?.actions?.flatMap((action) =>
      action.action === "ITEM_UPDATE" && typeof action.id === "string"
        ? [action.id]
        : []
    ) ?? []

  if (
    originalQuantity !== undefined &&
    body.quantity === originalQuantity &&
    itemUpdateActionIds.length > 0
  ) {
    const orderPreview = await removeItemUpdateActions(
      req,
      id,
      itemUpdateActionIds
    )

    res.json({
      order_preview: orderPreview ?? (await previewOrderChange(req, id)),
    })
    return
  }

  const { result } = await orderEditUpdateItemQuantityWorkflow(req.scope).run({
    input: {
      ...body,
      items: [
        {
          ...body,
          id: itemId,
        },
      ],
      order_id: id,
    },
  })

  res.json({
    order_preview: result,
  })
}
