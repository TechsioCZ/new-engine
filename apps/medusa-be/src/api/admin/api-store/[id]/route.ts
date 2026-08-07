import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { ApiStoreModuleService } from "../../../../modules/api-store"
import { API_STORE_MODULE } from "../../../../modules/api-store"
import { deleteApiStoreConfigWorkflow } from "../../../../workflows/delete-api-store-config"
import { updateApiStoreConfigWorkflow } from "../../../../workflows/update-api-store-config"
import type { PostAdminApiStoreByIdSchemaType } from "../validators"

const getId = (req: MedusaRequest): string => req.params.id as string

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const apiStoreService =
    req.scope.resolve<ApiStoreModuleService>(API_STORE_MODULE)
  const id = getId(req)

  const apiStore = await apiStoreService.retrieveApiStoreConfig(id)

  res.json({ api_store: apiStore })
}

export async function POST(
  req: MedusaRequest<PostAdminApiStoreByIdSchemaType>,
  res: MedusaResponse
) {
  const id = getId(req)

  const { result } = await updateApiStoreConfigWorkflow(req.scope).run({
    input: {
      id,
      ...req.validatedBody,
    },
  })

  res.json(result)
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = getId(req)

  const { result } = await deleteApiStoreConfigWorkflow(req.scope).run({
    input: { id },
  })

  res.json({ deleted: true, id: result.id })
}
