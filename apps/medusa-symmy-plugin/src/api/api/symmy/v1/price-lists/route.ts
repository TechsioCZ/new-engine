import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPriceListsWorkflow } from "../../../../../workflows/price-lists-batch/workflow"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await listPriceListsWorkflow(req.scope).run({
    input: {
      code: typeof req.query.code === "string" ? req.query.code : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    },
  })
  res.status(200).json(result)
}
