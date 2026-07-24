import type {
  IAuthModuleService,
  IUserModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import type { MedusaSuiteOptions } from "@medusajs/test-utils"
import { SignJWT } from "jose"
import * as Scrypt from "scrypt-kdf"

export const adminHeaders: { headers: Record<string, string> } = {
  headers: {},
}

type TestHeaders = { headers: Record<string, string> }

export const createAdminUser = async (
  targetAdminHeaders: TestHeaders,
  appContainer: MedusaContainer
) => {
  const userModule = appContainer.resolve<IUserModuleService>(Modules.USER)
  const authModule = appContainer.resolve<IAuthModuleService>(Modules.AUTH)
  const user = await userModule.createUsers({
    first_name: "Admin",
    last_name: "User",
    email: "admin@medusa.js",
  })

  const hashConfig = { logN: 15, r: 8, p: 1 }
  const passwordHash = await Scrypt.kdf("somepassword", hashConfig)

  const authIdentity = await authModule.createAuthIdentities({
    provider_identities: [
      {
        provider: "emailpass",
        entity_id: "admin@medusa.js",
        provider_metadata: {
          password: Buffer.from(passwordHash).toString("base64"),
        },
      },
    ],
    app_metadata: {
      user_id: user.id,
    },
  })

  const jwtSecret = process.env["JWT_SECRET"]
  if (!jwtSecret) {
    throw new Error(
      "JWT_SECRET is required to create an integration-test admin"
    )
  }

  const token = await new SignJWT({
    actor_id: user.id,
    actor_type: "user",
    auth_identity_id: authIdentity.id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d")
    .sign(new TextEncoder().encode(jwtSecret))

  targetAdminHeaders.headers["authorization"] = `Bearer ${token}`

  return { user, authIdentity }
}

export const createStoreUser = async ({
  api,
  storeHeaders,
}: {
  api: MedusaSuiteOptions["api"]
  storeHeaders: TestHeaders
}) => {
  const registerToken = (
    await api.post("/auth/customer/emailpass/register", {
      email: "test@email.com",
      password: "password",
    })
  ).data.token

  const customer = (
    await api.post(
      "/store/customers",
      {
        email: "test@email.com",
      },
      {
        headers: {
          Authorization: `Bearer ${registerToken}`,
          ...storeHeaders.headers,
        },
      }
    )
  ).data.customer

  const token = (
    await api.post("/auth/customer/emailpass", {
      email: "test@email.com",
      password: "password",
    })
  ).data.token

  return { customer, token }
}
