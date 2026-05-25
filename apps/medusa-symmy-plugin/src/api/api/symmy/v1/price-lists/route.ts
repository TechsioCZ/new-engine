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
 * x-authenticated: true
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 *   - jwt_token: []
 * parameters:
 *   - in: query
 *     name: code
 *     description: Filter price lists by Symmy code.
 *     required: false
 *     schema:
 *       type: string
 *       description: Filter price lists by Symmy code.
 *   - in: query
 *     name: limit
 *     description: Limit the number of price lists returned.
 *     required: false
 *     schema:
 *       type: number
 *       description: Limit the number of price lists returned.
 *       default: 50
 *   - in: query
 *     name: offset
 *     description: The number of price lists to skip.
 *     required: false
 *     schema:
 *       type: number
 *       description: The number of price lists to skip.
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
 * x-workflow: listPriceListsWorkflow
 * x-events: []
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
