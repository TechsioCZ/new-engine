import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  getMeasurementUnitActiveProductCounts,
  getMeasurementUnitService,
  toMeasurementUnitResponse,
} from "../../../utils/measurement-units"
import {
  createMeasurementUnitsWorkflow,
  type MeasurementUnitInput,
} from "../../../workflows/measurement-unit"
import { escapeLikePattern } from "./utils"
import type {
  AdminCreateMeasurementUnitSchemaType,
  AdminGetMeasurementUnitsSchemaType,
} from "./validators"

const ORDER_FIELDS = new Set([
  "code",
  "created_at",
  "name",
  "symbol",
  "updated_at",
])
const LEADING_DASH_REGEX = /^-/

const parseOrder = (input?: string) => {
  const value = input ?? "name"
  const direction = value.startsWith("-") ? "DESC" : "ASC"
  const field = value.replace(LEADING_DASH_REGEX, "")

  if (!ORDER_FIELDS.has(field)) {
    return { name: "ASC" }
  }

  return {
    [field]: direction,
  }
}

export async function GET(
  req: MedusaRequest<unknown, AdminGetMeasurementUnitsSchemaType>,
  res: MedusaResponse
) {
  const service = getMeasurementUnitService(req.scope)
  const { code, include_deleted, limit, offset, q } = req.validatedQuery
  const order = parseOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order
  )
  const escapedQuery = q ? escapeLikePattern(q) : undefined
  let filters = {}

  if (code) {
    filters = { code }
  } else if (escapedQuery) {
    filters = {
      $or: [
        { code: { $ilike: `%${escapedQuery}%` } },
        { name: { $ilike: `%${escapedQuery}%` } },
        { symbol: { $ilike: `%${escapedQuery}%` } },
      ],
    }
  }

  const [units, count] = await service.listAndCountMeasurementUnits(filters, {
    order,
    skip: offset,
    take: limit,
    withDeleted: include_deleted,
  })
  const activeProductCounts = await getMeasurementUnitActiveProductCounts(
    req.scope,
    units.map((unit) => unit.id)
  )

  res.json({
    count,
    limit,
    measurement_units: units.map((unit) =>
      toMeasurementUnitResponse(unit, activeProductCounts.get(unit.id) ?? 0)
    ),
    offset,
  })
}

export async function POST(
  req: MedusaRequest<AdminCreateMeasurementUnitSchemaType>,
  res: MedusaResponse
) {
  const input: MeasurementUnitInput = {
    code: req.validatedBody.code,
    description: req.validatedBody.description,
    name: req.validatedBody.name,
    symbol: req.validatedBody.symbol,
  }
  const { result } = await createMeasurementUnitsWorkflow(req.scope).run({
    input: {
      units: [input],
    },
  })
  const created = result[0]

  if (!created?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Measurement unit creation failed: missing id"
    )
  }

  const unit = await getMeasurementUnitService(
    req.scope
  ).retrieveMeasurementUnit(created.id)

  res.status(200).json({
    measurement_unit: toMeasurementUnitResponse(unit),
  })
}
