import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CLAIM_CASE_MODULE } from "../../../modules/claim-case"
import type ClaimCaseModuleService from "../../../modules/claim-case/service"
import type {
  VerifiedOrderItem,
  VerifyClaimAccessInput,
  VerifyClaimAccessResult,
} from "../types"

type OrderLookup = {
  display_id: number | string
  id: string
  items: VerifiedOrderItem[]
}

type CompensationInput = {
  access_id: string
  attempts: number
}

const MAX_ATTEMPTS = 5

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function secretsMatch(actualHash: string, expectedHash: string) {
  const actual = Buffer.from(actualHash, "hex")
  const expected = Buffer.from(expectedHash, "hex")

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function invalidCodeError() {
  return new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Verification code is invalid or expired."
  )
}

export const verifyClaimAccessStep = createStep(
  "verify-claim-access",
  async (input: VerifyClaimAccessInput, { container }) => {
    const service = container.resolve<ClaimCaseModuleService>(CLAIM_CASE_MODULE)
    let access: Awaited<ReturnType<typeof service.retrieveClaimAccess>>

    try {
      access = await service.retrieveClaimAccess(input.challenge_id)
    } catch {
      throw invalidCodeError()
    }

    if (
      access.used_at ||
      access.verified_at ||
      access.expires_at.getTime() <= Date.now() ||
      access.attempts >= MAX_ATTEMPTS
    ) {
      throw invalidCodeError()
    }

    const attempts = access.attempts + 1
    if (!secretsMatch(hashSecret(input.code), access.code_hash)) {
      await service.updateClaimAccesses({ id: access.id, attempts })
      throw invalidCodeError()
    }

    const accessToken = randomBytes(32).toString("base64url")
    const verifiedAt = new Date()
    await service.updateClaimAccesses({
      access_token_hash: hashSecret(accessToken),
      attempts,
      id: access.id,
      verified_at: verifiedAt,
    })

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "items.id",
        "items.title",
        "items.quantity",
        "items.product_id",
        "items.variant_id",
      ],
      filters: { id: access.order_id },
    })
    const order = data[0] as OrderLookup | undefined
    if (!order) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found.")
    }

    return new StepResponse<VerifyClaimAccessResult, CompensationInput>(
      {
        access_token: accessToken,
        order: {
          display_id: String(order.display_id),
          items: order.items,
        },
      },
      { access_id: access.id, attempts: access.attempts }
    )
  },
  async (input, { container }) => {
    if (!input) {
      return
    }

    await container
      .resolve<ClaimCaseModuleService>(CLAIM_CASE_MODULE)
      .updateClaimAccesses({
        access_token_hash: null,
        attempts: input.attempts,
        id: input.access_id,
        verified_at: null,
      })
  }
)
