import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { GLSLabelFormat } from "../../../modules/gls-client/types"
import { generateGLSLabelsWorkflow } from "../../../workflows/gls-labels"
import type { PostAdminGLSLabelsSchemaType } from "./validators"

export async function POST(
  req: MedusaRequest<PostAdminGLSLabelsSchemaType>,
  res: MedusaResponse
): Promise<void> {
  const {
    order_ids: orderIds,
    label_format: labelFormat,
    label_offset: labelOffset,
  } = req.validatedBody

  const { result } = await generateGLSLabelsWorkflow(req.scope).run({
    input: {
      order_ids: orderIds,
      label_format: labelFormat as GLSLabelFormat | undefined,
      label_offset: labelOffset,
    },
  })

  const buffer = Buffer.from(result.pdf_base64, "base64")

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${result.filename}"`,
    "Content-Length": buffer.length,
  })
  res.send(buffer)
}
