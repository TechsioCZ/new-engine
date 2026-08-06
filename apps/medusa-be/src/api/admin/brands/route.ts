import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import type { BrandInput } from "../../../workflows/brand/types"
import { createBrandsWorkflow } from "../../../workflows/brand/workflows/create-brands"
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
const LEADING_DASH_REGEX = /^-/u

const parseOrder = (value = "title") => {
  const direction = value.startsWith("-") ? "DESC" : "ASC"
  const field = value.replace(LEADING_DASH_REGEX, "")

  if (!ORDER_FIELDS.has(field)) {
    return { title: "ASC" }
  }

  return {
    [field]: direction,
  }
}

const get = async (
  req: AuthenticatedMedusaRequest<unknown, AdminGetBrandsSchemaType>,
  res: MedusaResponse,
) => {
  const service = getBrandService(req.scope)
  const { handle, include_deleted, limit, offset, q } = req.validatedQuery
  const order = parseOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order,
  )
  const escapedQuery =
    q === undefined || q === "" ? undefined : escapeLikePattern(q)
  let filters = {}

  if (handle !== undefined && handle !== "") {
    filters = { handle }
  } else if (escapedQuery !== undefined && escapedQuery !== "") {
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
    brands.map((brand) => brand.id),
  )

  res.json({
    brands: brands.map((brand) =>
      toBrandResponse(brand, activeProductCounts.get(brand.id) ?? 0),
    ),
    count,
    limit,
    offset,
  })
}

const post = async (
  req: AuthenticatedMedusaRequest<AdminCreateBrandSchemaType>,
  res: MedusaResponse,
) => {
  const input: BrandInput = {
    attributes: req.validatedBody.attributes,
    gpsr_contact_email: req.validatedBody.gpsr_contact_email,
    gpsr_european_reseller_contact_email:
      req.validatedBody.gpsr_european_reseller_contact_email,
    gpsr_european_reseller_manufacturing_company_name:
      req.validatedBody.gpsr_european_reseller_manufacturing_company_name,
    gpsr_european_reseller_postal_address:
      req.validatedBody.gpsr_european_reseller_postal_address,
    gpsr_manufactured_outside_eu:
      req.validatedBody.gpsr_manufactured_outside_eu,
    gpsr_manufacturing_company_name:
      req.validatedBody.gpsr_manufacturing_company_name,
    gpsr_postal_address: req.validatedBody.gpsr_postal_address,
    handle: req.validatedBody.handle,
    title: req.validatedBody.title,
  }

  const { result } = await createBrandsWorkflow(req.scope).run({
    input: {
      brands: [input],
    },
  })
  const [created] = result

  if (created?.id === undefined || created.id === "") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Brand creation failed: missing id",
    )
  }

  const brand = await getBrandService(req.scope).retrieveBrand(created.id, {
    relations: ["attributes", "attributes.attributeType"],
  })

  res.status(200).json({ brand: toBrandResponse(brand) })
}

export { get as GET, post as POST }
