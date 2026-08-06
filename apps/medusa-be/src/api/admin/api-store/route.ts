import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type { ApiStoreModuleService } from "../../../modules/api-store"
import { API_STORE_MODULE } from "../../../modules/api-store"
import { definedProperties } from "../../../utils/defined-properties"
import { createApiStoreConfigWorkflow } from "../../../workflows/create-api-store-config"
import type {
  GetAdminApiStoreSchemaType,
  PostAdminApiStoreSchemaType,
} from "./validators"

const get = async (
  req: MedusaRequest<unknown, GetAdminApiStoreSchemaType>,
  res: MedusaResponse,
) => {
  const apiStoreService =
    req.scope.resolve<ApiStoreModuleService>(API_STORE_MODULE)
  const { limit, offset, name } = req.validatedQuery

  const [apiStores, count] = await apiStoreService.listApiStoreConfigs(
    name === undefined || name === "" ? {} : { name },
    { skip: offset, take: limit },
  )

  res.json({
    api_stores: apiStores,
    count,
    limit,
    offset,
  })
}

const post = async (
  req: MedusaRequest<PostAdminApiStoreSchemaType>,
  res: MedusaResponse,
) => {
  const { result } = await createApiStoreConfigWorkflow(req.scope).run({
    input: definedProperties(req.validatedBody),
  })

  res.status(201).json(result)
}

export { get as GET, post as POST }
