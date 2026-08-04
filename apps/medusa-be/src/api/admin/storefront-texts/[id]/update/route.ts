import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { updateStorefrontTextWorkflow } from "../../../../../workflows/storefront-text/workflows/update-storefront-text"
import { handleStorefrontTextLockError } from "../../lock-error"
import type { AdminUpdateStorefrontTextSchemaType } from "../../validators"

const getStorefrontTextId = (req: MedusaRequest) =>
  typeof req.params["id"] === "string" ? req.params["id"] : undefined

const toWorkflowUpdate = (body: AdminUpdateStorefrontTextSchemaType) => ({
  ...(body.override_value === undefined
    ? {}
    : { override_value: body.override_value }),
  ...(body.status === undefined ? {} : { status: body.status }),
})

export async function POST(
  req: MedusaRequest<AdminUpdateStorefrontTextSchemaType>,
  res: MedusaResponse
) {
  const id = getStorefrontTextId(req)

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Storefront text id is required"
    )
  }

  try {
    const { result: storefrontText } = await updateStorefrontTextWorkflow(
      req.scope
    ).run({
      input: {
        id,
        update: toWorkflowUpdate(req.validatedBody),
      },
    })

    res.json({ storefront_text: storefrontText })
  } catch (error) {
    handleStorefrontTextLockError(error, res)
  }
}
