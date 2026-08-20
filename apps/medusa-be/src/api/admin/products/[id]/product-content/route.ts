import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { IProductModuleService } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  findProductContent,
  resolveOriginalProductContent,
} from "../../../../../utils/product-content-service"
import { updateProductContentWorkflow } from "../../../../../workflows/product-content/workflows/update-product-content"
import type { AdminUpdateProductContentSchemaType } from "../../../product-content/validators"

const getProduct = async (
  req: AuthenticatedMedusaRequest,
  productId: string
) => {
  const productService = req.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )
  const products = await productService.listProducts(
    { id: productId },
    { select: ["id", "description", "metadata"], take: 1 }
  )
  const product = products[0]

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product "${productId}" was not found.`
    )
  }

  return product
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const productId = req.params.id ?? ""
  const product = await getProduct(req, productId)
  const record = await findProductContent(req.scope, productId)

  res.json({
    product_content: {
      ...resolveOriginalProductContent({ metadata: product.metadata, record }),
      id: record?.id ?? null,
      product_id: productId,
    },
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<AdminUpdateProductContentSchemaType>,
  res: MedusaResponse
) {
  const productId = req.params.id ?? ""
  const product = await getProduct(req, productId)

  const { result } = await updateProductContentWorkflow(req.scope).run({
    input: {
      content: {
        composition: req.validatedBody.composition,
        other: req.validatedBody.other,
        usage: req.validatedBody.usage,
        warning: req.validatedBody.warning,
      },
      description: req.validatedBody.description || null,
      metadata: product.metadata ?? null,
      product_id: productId,
    },
  })

  res.json(result)
}
