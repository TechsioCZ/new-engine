import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPriceListsWorkflow } from "../../../../../workflows/price-lists-batch/workflow"

const parseQueryNumber = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * @api [get] /api/symmy/v1/price-lists
 * operationId: ListSymmyPriceLists
 * summary: List Symmy price lists
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * parameters:
 *   - in: query
 *     name: code
 *     required: false
 *     schema:
 *       type: string
 *   - in: query
 *     name: limit
 *     required: false
 *     schema:
 *       type: number
 *       default: 50
 *   - in: query
 *     name: offset
 *     required: false
 *     schema:
 *       type: number
 *       default: 0
 * responses:
 *   "200":
 *     description: Price lists linked to Symmy codes.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyListPriceListsResponse"
 *   "400":
 *     description: limit or offset is not numeric.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyPriceListsQueryValidationErrorResponse"
 *   "401":
 *     description: Missing or invalid authentication token.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyUnauthorizedErrorResponse"
 *   "500":
 *     description: Unexpected Symmy API error.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyInternalErrorResponse"
 */
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
