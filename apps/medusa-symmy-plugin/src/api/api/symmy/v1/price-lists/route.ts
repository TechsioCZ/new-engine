import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPriceListsWorkflow } from "../../../../../workflows/price-lists-batch/workflow"

const parseQueryNumber = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const limit = parseQueryNumber(req.query.limit)
  const offset = parseQueryNumber(req.query.offset)

  if (
    (req.query.limit !== undefined && limit === undefined) ||
    (req.query.offset !== undefined && offset === undefined)
  ) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "limit and offset must be numeric",
      },
    })
    return
  }

  const { result } = await listPriceListsWorkflow(req.scope).run({
    input: {
      code: typeof req.query.code === "string" ? req.query.code : undefined,
      limit: limit ?? 50,
      offset: offset ?? 0,
    },
  })
  res.status(200).json(result)
}
