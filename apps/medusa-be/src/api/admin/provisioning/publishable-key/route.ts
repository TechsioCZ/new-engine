import type {
  IApiKeyModuleService,
  ILockingModule,
} from "@medusajs/framework/types"
import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  getActivePublishableKey,
  provisionPublishableKey,
  resolvePublishableKeyTitle,
  type PublishableKeyResult,
} from "../../../../utils/publishable-key"

export const AdminPublishableKeyBodySchema = z.object({
  title: z.string().optional(),
})

export type AdminPublishableKeyBodySchemaType = z.infer<
  typeof AdminPublishableKeyBodySchema
>

type AdminPublishableKeyQuerySchemaType = {
  title?: string
}

function readTitleFromQuery(
  req: AuthenticatedMedusaRequest<unknown, AdminPublishableKeyQuerySchemaType>
): string | undefined {
  const rawTitle = req.query.title

  return typeof rawTitle === "string" ? rawTitle : undefined
}

function toApiKeyResponse(result: PublishableKeyResult) {
  return {
    api_key: {
      id: result.apiKey.id,
      title: result.apiKey.title,
      token: result.apiKey.token,
      type: result.apiKey.type,
    },
    created: result.created,
  }
}

export async function GET(
  req: AuthenticatedMedusaRequest<unknown, AdminPublishableKeyQuerySchemaType>,
  res: MedusaResponse
) {
  const apiKeyService = req.scope.resolve<IApiKeyModuleService>(Modules.API_KEY)
  const title = readTitleFromQuery(req)
  const result = await getActivePublishableKey({ apiKeyService, title })

  if (!result) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No active publishable API key found for title "${resolvePublishableKeyTitle(title)}".`
    )
  }

  res.status(200).json(toApiKeyResponse(result))
}

export async function POST(
  req: AuthenticatedMedusaRequest<AdminPublishableKeyBodySchemaType>,
  res: MedusaResponse
) {
  const apiKeyService = req.scope.resolve<IApiKeyModuleService>(Modules.API_KEY)
  const lockingModule = req.scope.resolve<ILockingModule>(Modules.LOCKING)
  const result = await provisionPublishableKey({
    apiKeyService,
    createdBy: req.auth_context.actor_id,
    lockingModule,
    title: req.validatedBody.title,
  })

  res.status(200).json(toApiKeyResponse(result))
}
