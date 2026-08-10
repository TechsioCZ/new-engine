import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { syncStorefrontTextsWorkflow } from "../../../../workflows/storefront-text/workflows/sync-storefront-texts"
import { handleStorefrontTextLockError } from "../lock-error"

const post = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { result } = await syncStorefrontTextsWorkflow(req.scope).run({
      input: {},
    })

    res.json({ result })
  } catch (error) {
    handleStorefrontTextLockError(error, res)
  }
}

export { post as POST }
