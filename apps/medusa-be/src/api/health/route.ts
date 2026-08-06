import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const get = (_req: MedusaRequest, res: MedusaResponse) => {
  res.status(200).json({ status: "ok" })
}

export { get as GET }
