import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { kebabCase, MedusaError } from "@medusajs/framework/utils"
import {
  createBrandsWorkflow,
  type BrandInput,
} from "../../../workflows/brand"
import {
  escapeLikePattern,
  getBrandActiveProductCounts,
  getBrandService,
  toBrandResponse,
} from "./utils"
import type {
  AdminCreateBrandSchemaType,
  AdminGetBrandsSchemaType,
} from "./validators"

const ORDER_FIELDS = new Set(["title", "handle", "created_at", "updated_at"])
const LEADING_DASH_REGEX = /^-/

const parseOrder = (input?: string) => {
  const value = input ?? "title"
  const direction = value.startsWith("-") ? "DESC" : "ASC"
  const field = value.replace(LEADING_DASH_REGEX, "")

  if (!ORDER_FIELDS.has(field)) {
    return { title: "ASC" }
  }

  return {
    [field]: direction,
  }
}

export async function GET(
  req: MedusaRequest<unknown, AdminGetBrandsSchemaType>,
  res: MedusaResponse
) {
  const service = getBrandService(req.scope)
  const { handle, include_deleted, limit, offset, q } = req.validatedQuery
  const order = parseOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order
  )
  const escapedQuery = q ? escapeLikePattern(q) : undefined
  let filters = {}

  if (handle) {
    filters = { handle }
  } else if (escapedQuery) {
    filters = {
      $or: [
        { title: { $ilike: `%${escapedQuery}%` } },
        { handle: { $ilike: `%${escapedQuery}%` } },
      ],
    }
  }

  const [brands, count] = await service.listAndCountBrands(filters, {
    order,
    relations: ["attributes", "attributes.attributeType"],
    skip: offset,
    take: limit,
    withDeleted: include_deleted,
  })
  const activeProductCounts = await getBrandActiveProductCounts(
    req.scope,
    brands.map((brand) => brand.id)
  )

  res.json({
    count,
    limit,
    offset,
    brands: brands.map((brand) =>
      toBrandResponse(brand, activeProductCounts.get(brand.id) ?? 0)
    ),
  })
}

export async function POST(
  req: MedusaRequest<AdminCreateBrandSchemaType>,
  res: MedusaResponse
) {
  const input: BrandInput = {
    attributes: req.validatedBody.attributes,
    handle: req.validatedBody.handle ?? kebabCase(req.validatedBody.title),
    title: req.validatedBody.title,
  }
  const [existing] = await getBrandService(req.scope).listBrands(
    {
      handle: input.handle,
    },
    {
      take: 1,
      withDeleted: true,
    }
  )

  if (existing?.deleted_at) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Brand with handle "${input.handle}" already exists as a deleted record. Restore it instead of creating a new brand.`
    )
  }

  if (existing) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Brand with handle "${input.handle}" already exists.`
    )
  }

  const { result } = await createBrandsWorkflow(req.scope).run({
    input: {
      brands: [input],
    },
  })
  const created = result[0]

  if (!created?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Brand creation failed: missing id"
    )
  }

  const brand = await getBrandService(req.scope).retrieveBrand(
    created.id,
    {
      relations: ["attributes", "attributes.attributeType"],
    }
  )

  res.status(200).json({ brand: toBrandResponse(brand) })
}
