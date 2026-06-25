import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IAuthModuleService, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { PostSymmyAuthUserEmailPassSchemaType } from "./validators"

const JWT_TTL_SECONDS = 24 * 60 * 60

export async function POST(
  req: MedusaRequest<PostSymmyAuthUserEmailPassSchemaType>,
  res: MedusaResponse
) {
  const authModuleService = req.scope.resolve<IAuthModuleService>(Modules.AUTH)
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { email, password } = req.validatedBody

  const result = await authModuleService.authenticate("emailpass", {
    actor_type: "user",
    body: { email, password },
  })

  if (!(result.success && result.authIdentity)) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      typeof result.error === "string"
        ? result.error
        : "Invalid email or password"
    )
  }

  const userId = await resolveUserId(query, result.authIdentity)
  if (!userId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "User linked to the auth identity was not found"
    )
  }

  const jwtSecret = process.env.JWT_SECRET?.trim()
  if (!jwtSecret) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "JWT_SECRET is not configured"
    )
  }

  const authIdentity = result.authIdentity as typeof result.authIdentity & {
    user_metadata?: Record<string, unknown>
  }

  const { SignJWT } = await import("jose")
  const token = await new SignJWT({
    actor_id: userId,
    actor_type: "user",
    auth_identity_id: authIdentity.id,
    auth_provider: "emailpass",
    app_metadata: authIdentity.app_metadata ?? {},
    user_metadata: authIdentity.user_metadata ?? {},
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_TTL_SECONDS}s`)
    .sign(new TextEncoder().encode(jwtSecret))

  res.status(200).json({ token })
}

async function resolveUserId(
  query: Query,
  authIdentity: {
    app_metadata?: Record<string, unknown> | null
    user_metadata?: Record<string, unknown> | null
  }
) {
  const linkedUserId = authIdentity.app_metadata?.user_id
  if (typeof linkedUserId === "string" && linkedUserId.length > 0) {
    return linkedUserId
  }

  const email = authIdentity.user_metadata?.email
  if (typeof email !== "string" || !email) {
    return
  }

  const { data } = await query.graph({
    entity: "user",
    fields: ["id"],
    filters: { email },
  })

  return Array.isArray(data) && typeof data[0]?.id === "string"
    ? data[0].id
    : undefined
}
