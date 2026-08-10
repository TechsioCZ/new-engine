import type { Query } from "@medusajs/framework/types"
import { generateJwtToken, MedusaError } from "@medusajs/framework/utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  assertCustomerAccountIsActive,
  ensureAuthenticatedCustomerIsActive,
} from "../../src/api/store/customer-account-active"
import { assertInactiveCustomerReactivationIdentity } from "../../src/api/store/customers/helpers"
import { storeMiddlewares } from "../../src/api/store/middlewares"
import {
  createCustomerAccountDeactivationNonce,
  createCustomerAccountDeactivationToken,
  CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY,
  verifyCustomerAccountDeactivationToken,
} from "../../src/utils/customer-account-deactivation"
import {
  buildReactivatedCustomerUpdateInput,
  verifyAuthIdentityEmail,
} from "../../src/workflows/customer/helpers"

const JWT_SECRET = "customer-account-security-test-secret"

const expectMedusaErrorType = (
  operation: () => unknown,
  type: string,
): void => {
  try {
    operation()
  } catch (error) {
    expect(error).toBeInstanceOf(MedusaError)
    if (error instanceof MedusaError) {
      expect(error.type).toBe(type)
    }
    return
  }

  throw new Error("Expected operation to throw a MedusaError")
}

const isQuery = (value: unknown): value is Query => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  return "graph" in value && typeof value.graph === "function"
}

const createQuery = (data: unknown[]): Query => {
  const candidate: unknown = {
    graph: vi
      .fn<() => Promise<{ data: unknown[] }>>()
      .mockResolvedValue({ data }),
  }
  if (!isQuery(candidate)) {
    throw new TypeError("Expected a query with a graph function")
  }

  return candidate
}

describe("customer account security", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("requires the retained customer credential identity for reactivation", () => {
    expectMedusaErrorType(() => {
      assertInactiveCustomerReactivationIdentity({
        customerId: "cus_1",
      })
    }, MedusaError.Types.NOT_ALLOWED)
    expectMedusaErrorType(() => {
      assertInactiveCustomerReactivationIdentity({
        actorId: "cus_attacker",
        customerId: "cus_1",
      })
    }, MedusaError.Types.NOT_ALLOWED)

    expect(() => {
      assertInactiveCustomerReactivationIdentity({
        actorId: "cus_1",
        customerId: "cus_1",
      })
    }).not.toThrow()
  })

  it("requires the current auth identity to remain linked to the inactive customer", async () => {
    await expect(
      verifyAuthIdentityEmail({
        authIdentityId: "auth_fresh",
        customerId: "cus_1",
        email: "customer@example.com",
        query: createQuery([
          {
            auth_identity: { app_metadata: {} },
            auth_identity_id: "auth_fresh",
            entity_id: "customer@example.com",
            id: "provider_1",
          },
        ]),
      }),
    ).rejects.toMatchObject({ type: MedusaError.Types.NOT_ALLOWED })

    await expect(
      verifyAuthIdentityEmail({
        authIdentityId: "auth_retained",
        customerId: "cus_1",
        email: "customer@example.com",
        query: createQuery([
          {
            auth_identity: { app_metadata: { customer_id: "cus_1" } },
            auth_identity_id: "auth_retained",
            entity_id: "customer@example.com",
            id: "provider_1",
          },
        ]),
      }),
    ).resolves.toBeUndefined()
  })

  it("rejects inactive and soft-deleted customers while allowing active customers", () => {
    expectMedusaErrorType(() => {
      assertCustomerAccountIsActive({
        has_account: false,
        id: "cus_1",
      })
    }, MedusaError.Types.NOT_ALLOWED)
    expectMedusaErrorType(() => {
      assertCustomerAccountIsActive({
        deleted_at: new Date(),
        has_account: true,
        id: "cus_1",
      })
    }, MedusaError.Types.NOT_ALLOWED)

    expect(() => {
      assertCustomerAccountIsActive({
        deleted_at: null,
        has_account: true,
        id: "cus_1",
      })
    }).not.toThrow()
  })

  it("registers the active-customer guard centrally for store routes", () => {
    const [globalStoreMiddleware] = storeMiddlewares

    expect(globalStoreMiddleware?.matcher).toBeInstanceOf(RegExp)
    expect(globalStoreMiddleware?.middlewares).toContain(
      ensureAuthenticatedCustomerIsActive,
    )
  })

  it("binds deactivation tokens to a random persisted nonce", async () => {
    vi.stubEnv("JWT_SECRET", JWT_SECRET)
    const firstNonce = createCustomerAccountDeactivationNonce()
    const secondNonce = createCustomerAccountDeactivationNonce()
    const token = createCustomerAccountDeactivationToken({
      customer_id: "cus_1",
      deactivation_nonce: firstNonce,
      email: "customer@example.com",
    })

    expect(firstNonce).not.toBe(secondNonce)
    await expect(
      verifyCustomerAccountDeactivationToken(token),
    ).resolves.toStrictEqual({
      customer_id: "cus_1",
      deactivation_nonce: firstNonce,
      email: "customer@example.com",
    })
  })

  it("rejects legacy deactivation tokens without a nonce", async () => {
    vi.stubEnv("JWT_SECRET", JWT_SECRET)
    const legacyToken = generateJwtToken(
      {
        customer_id: "cus_1",
        purpose: "customer-account-deactivation",
      },
      { expiresIn: "30m", secret: JWT_SECRET },
    )

    await expect(
      verifyCustomerAccountDeactivationToken(legacyToken),
    ).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
  })

  it("does not allow registration metadata to restore a consumed nonce", () => {
    const update = buildReactivatedCustomerUpdateInput(
      {
        auth_identity_id: "auth_1",
        customer: { id: "cus_1" },
        email: "customer@example.com",
        metadata: {
          [CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY]: "old-nonce",
          preference: "kept",
        },
      },
      {
        id: "cus_1",
        metadata: {
          [CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY]: "persisted-old",
        },
      },
    )

    expect(update.metadata).toStrictEqual({ preference: "kept" })
  })
})
