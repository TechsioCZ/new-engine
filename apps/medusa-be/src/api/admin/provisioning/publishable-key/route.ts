import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type {
  IApiKeyModuleService,
  ILockingModule,
} from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import {
  getActivePublishableKey,
  provisionPublishableKey,
  resolvePublishableKeyTitle,
} from "../../../../utils/publishable-key"
import type { PublishableKeyResult } from "../../../../utils/publishable-key"

export const AdminPublishableKeyBodySchema = z.object({
  title: z.string().optional(),
})

export type AdminPublishableKeyBodySchemaType = z.infer<
  typeof AdminPublishableKeyBodySchema
>

interface AdminPublishableKeyQuerySchemaType {
  title?: string
}

const readTitleFromQuery = (
  req: AuthenticatedMedusaRequest<unknown, AdminPublishableKeyQuerySchemaType>,
): string | undefined => {
  const rawTitle = req.query["title"]

  return typeof rawTitle === "string" ? rawTitle : undefined
}

const toApiKeyResponse = (result: PublishableKeyResult) => ({
  api_key: {
    id: result.apiKey.id,
    title: result.apiKey.title,
    token: result.apiKey.token,
    type: result.apiKey.type,
  },
  created: result.created,
})

const getHandler = async (
  req: AuthenticatedMedusaRequest<unknown, AdminPublishableKeyQuerySchemaType>,
  res: MedusaResponse,
) => {
  const apiKeyService = req.scope.resolve<IApiKeyModuleService>(Modules.API_KEY)
  const title = readTitleFromQuery(req)
  const result = await getActivePublishableKey({
    apiKeyService,
    ...(title === undefined ? {} : { title }),
  })

  if (!result) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No active publishable API key found for title "${resolvePublishableKeyTitle(title)}".`,
    )
  }

  res.status(200).json(toApiKeyResponse(result))
}

const postHandler = async (
  req: AuthenticatedMedusaRequest<AdminPublishableKeyBodySchemaType>,
  res: MedusaResponse,
) => {
  const apiKeyService = req.scope.resolve<IApiKeyModuleService>(Modules.API_KEY)
  const lockingModule = req.scope.resolve<ILockingModule>(Modules.LOCKING)
  const result = await provisionPublishableKey({
    apiKeyService,
    createdBy: req.auth_context.actor_id,
    lockingModule,
    ...(req.validatedBody.title === undefined
      ? {}
      : { title: req.validatedBody.title }),
  })

  res.status(200).json(toApiKeyResponse(result))
}

export { getHandler as GET, postHandler as POST }
