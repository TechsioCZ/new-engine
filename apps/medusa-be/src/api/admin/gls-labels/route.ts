import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { generateGLSLabelsWorkflow } from "../../../workflows/gls-labels"
import type { PostAdminGLSLabelsSchemaType } from "./validators"

const post = async (
  req: MedusaRequest<PostAdminGLSLabelsSchemaType>,
  res: MedusaResponse,
): Promise<void> => {
  const { order_ids: orderIds } = req.validatedBody

  const { result } = await generateGLSLabelsWorkflow(req.scope).run({
    input: {
      order_ids: orderIds,
    },
  })

  const buffer = Buffer.from(result.pdf_base64, "base64")

  res.set({
    "Content-Disposition": `attachment; filename="${result.filename}"`,
    "Content-Length": buffer.length,
    "Content-Type": "application/pdf",
  })
  res.send(buffer)
}

export { post as POST }
