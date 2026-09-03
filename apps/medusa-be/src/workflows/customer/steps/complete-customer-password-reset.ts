import { createHash } from "node:crypto"
import type { IAuthModuleService, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type CompleteCustomerPasswordResetInput = {
  entity_id: string
  jti: string
  password: string
}

type PasswordResetTokenRecord = {
  entity_id: string
  expires_at?: Date | null | string
  provider_identity?: {
    entity_id?: string
    provider?: string
  } | null
}

type TransactionConnection = {
  raw: (sql: string, bindings?: unknown[]) => Promise<unknown>
}

type DatabaseConnection = {
  transaction: <Result>(
    task: (connection: TransactionConnection) => Promise<Result>
  ) => Promise<Result>
}

const privateFlowNotFound = (): never => {
  throw new MedusaError(MedusaError.Types.NOT_FOUND, "Resource was not found.")
}

export const completeCustomerPasswordResetStep = createStep(
  "complete-customer-password-reset",
  async (
    input: CompleteCustomerPasswordResetInput,
    { container }
  ): Promise<StepResponse<{ auth_identity_id: string }>> => {
    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )
    const database = container.resolve<DatabaseConnection>(
      ContainerRegistrationKeys.PG_CONNECTION
    )
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const tokenHash = createHash("sha256").update(input.jti).digest("hex")

    const result = await database.transaction(async (connection) => {
      // Serialize the exact JTI before rechecking it. Updating first keeps the
      // same token retriable on provider failure; consuming last makes success
      // single-use without allowing a concurrent replay to reach the update.
      await connection.raw(
        "select pg_advisory_xact_lock(hashtextextended(?, 0))",
        [`customer-password-reset:${tokenHash}`]
      )

      const { data } = await query.graph({
        entity: "auth_password_reset_token",
        fields: [
          "entity_id",
          "expires_at",
          "provider_identity.entity_id",
          "provider_identity.provider",
        ],
        filters: { token_hash: tokenHash },
        pagination: { take: 1 },
      })
      const resetToken = (data as PasswordResetTokenRecord[])[0]
      const expiresAtTimestamp = resetToken?.expires_at
        ? new Date(resetToken.expires_at).getTime()
        : Number.NaN
      if (
        !resetToken ||
        resetToken.entity_id !== input.entity_id ||
        resetToken.provider_identity?.entity_id !== input.entity_id ||
        resetToken.provider_identity.provider !== "emailpass" ||
        !Number.isFinite(expiresAtTimestamp) ||
        expiresAtTimestamp <= Date.now()
      ) {
        return privateFlowNotFound()
      }

      const { authIdentity, error, success } =
        await authModuleService.updateProvider("emailpass", {
          entity_id: input.entity_id,
          password: input.password,
        })
      if (!(success && authIdentity)) {
        throw new MedusaError(
          MedusaError.Types.UNAUTHORIZED,
          error || "Unauthorized"
        )
      }

      try {
        await authModuleService.consumePasswordResetToken({
          entity_id: input.entity_id,
          jti: input.jti,
          provider: "emailpass",
        })
      } catch {
        return privateFlowNotFound()
      }

      return { auth_identity_id: authIdentity.id }
    })

    return new StepResponse(result)
  }
)
