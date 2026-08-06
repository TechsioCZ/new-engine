import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { omitUndefined } from "@techsio/std/object"

import type { ApiStoreModuleService } from "../../../../modules/api-store"
import { API_STORE_MODULE } from "../../../../modules/api-store"
import { deleteApiStoreConfigWorkflow } from "../../../../workflows/delete-api-store-config"
import { updateApiStoreConfigWorkflow } from "../../../../workflows/update-api-store-config"
import type { PostAdminApiStoreByIdSchemaType } from "../validators"

const getId = (req: MedusaRequest): string => {
  const { id } = req.params
  if (typeof id !== "string" || id === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "API store id is required",
    )
  }

  return id
}

const getRoute = async (req: MedusaRequest, res: MedusaResponse) => {
  const apiStoreService =
    req.scope.resolve<ApiStoreModuleService>(API_STORE_MODULE)
  const id = getId(req)

  const apiStore = await apiStoreService.retrieveApiStoreConfig(id)

  res.json({ api_store: apiStore })
}

const postRoute = async (
  req: MedusaRequest<PostAdminApiStoreByIdSchemaType>,
  res: MedusaResponse,
) => {
  const id = getId(req)

  const { result } = await updateApiStoreConfigWorkflow(req.scope).run({
    input: {
      id,
      ...omitUndefined(req.validatedBody),
    },
  })

  res.json(result)
}

const deleteRoute = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = getId(req)

  const { result } = await deleteApiStoreConfigWorkflow(req.scope).run({
    input: { id },
  })

  res.json({ deleted: true, id: result.id })
}

export { deleteRoute as DELETE, getRoute as GET, postRoute as POST }
