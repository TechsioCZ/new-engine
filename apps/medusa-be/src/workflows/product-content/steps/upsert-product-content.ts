import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  getProductContentService,
  type ProductContentRecord,
} from "../../../utils/product-content-service"
import type { UpsertProductContentInput } from "../types"

type ProductContentCompensation =
  | { action: "created"; id: string }
  | { action: "updated"; previous: ProductContentRecord }

export const upsertProductContentStep = createStep(
  "upsert-product-content",
  async (input: UpsertProductContentInput, { container }) => {
    const service = getProductContentService(container)
    const existing = (await service.listProductContents(
      { product_id: input.product_id },
      { take: 1 }
    )) as ProductContentRecord[]
    const previous = existing[0]

    if (previous) {
      const updated = await service.updateProductContents({
        id: previous.id,
        composition: input.composition,
        other: input.other,
        usage: input.usage,
        warning: input.warning,
      })

      return new StepResponse<ProductContentRecord, ProductContentCompensation>(
        updated as ProductContentRecord,
        { action: "updated", previous }
      )
    }

    const created = await service.createProductContents(input)

    return new StepResponse<ProductContentRecord, ProductContentCompensation>(
      created as ProductContentRecord,
      { action: "created", id: created.id }
    )
  },
  async (compensation, { container }) => {
    if (!compensation) {
      return
    }

    const service = getProductContentService(container)
    if (compensation.action === "created") {
      await service.deleteProductContents(compensation.id)
      return
    }

    await service.updateProductContents(compensation.previous)
  }
)
