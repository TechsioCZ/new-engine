import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { ApiStoreModuleService } from "../../../modules/api-store"
import { API_STORE_MODULE } from "../../../modules/api-store"
import { createApiStoreConfigWorkflow } from "../../../workflows/create-api-store-config"
import type {
  GetAdminApiStoreSchemaType,
  PostAdminApiStoreSchemaType,
} from "./validators"

export async function GET(
  req: MedusaRequest<unknown, GetAdminApiStoreSchemaType>,
  res: MedusaResponse
) {
  const apiStoreService =
    req.scope.resolve<ApiStoreModuleService>(API_STORE_MODULE)
  const { limit, offset, name } = req.validatedQuery

  const [apiStores, count] = await apiStoreService.listApiStoreConfigs(
    name ? { name } : {},
    { take: limit, skip: offset }
  )

  res.json({
    api_stores: apiStores,
    count,
    limit,
    offset,
  })
}

export async function POST(
  req: MedusaRequest<PostAdminApiStoreSchemaType>,
  res: MedusaResponse
) {
  const { result } = await createApiStoreConfigWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json(result)
}
