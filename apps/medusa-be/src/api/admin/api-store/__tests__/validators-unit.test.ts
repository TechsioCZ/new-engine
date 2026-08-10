import { describe, expect, it } from "vitest"

import {
  PostAdminApiStoreByIdSchema,
  PostAdminApiStoreSchema,
} from "../validators"

describe("API Store admin validators", () => {
  it("preserves provider-owned credential keys and recursive JSON values", () => {
    const input = {
      credentials: {
        future_provider_key: "secret",
        nested: {
          enabled: true,
          retries: 3,
          scopes: ["reviews", null, { region: "cz" }],
        },
      },
      name: "Future provider",
    }

    expect(PostAdminApiStoreSchema.parse(input)).toStrictEqual(input)
  })

  it("uses the same recursive credential contract for updates", () => {
    const input = {
      credentials: {
        custom_boolean: false,
        custom_number: 42,
      },
    }

    expect(PostAdminApiStoreByIdSchema.parse(input)).toStrictEqual(input)
  })

  it("rejects non-JSON values inside credentials", () => {
    const result = PostAdminApiStoreSchema.safeParse({
      credentials: { invalid: Symbol("not JSON") },
      name: "Invalid provider",
    })

    expect(result.success).toBeFalsy()
  })
})
