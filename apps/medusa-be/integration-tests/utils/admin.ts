import type {
  IAuthModuleService,
  IUserModuleService,
  MedusaContainer,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { SignJWT } from "jose"
import { kdf } from "scrypt-kdf"

export const adminHeaders: { headers: Record<string, string> } = {
  headers: {},
}

const TEST_CUSTOMER_EMAIL = "test@email.com"
const authResponseSchema = z.object({
  data: z.object({ token: z.string() }),
})
const customerResponseSchema = z.object({
  data: z.object({ customer: z.unknown() }),
})

interface TestHeaders {
  headers: Record<string, string>
}

interface TestApi {
  post: (
    url: string,
    body: unknown,
    config?: { headers: Record<string, string> },
  ) => Promise<unknown>
}

export const createAdminUser = async (
  targetAdminHeaders: TestHeaders,
  appContainer: MedusaContainer,
) => {
  const userModule = appContainer.resolve<IUserModuleService>(Modules.USER)
  const authModule = appContainer.resolve<IAuthModuleService>(Modules.AUTH)
  const user = await userModule.createUsers({
    email: "admin@medusa.js",
    first_name: "Admin",
    last_name: "User",
  })

  const hashConfig = { logN: 15, p: 1, r: 8 }
  const passwordHash = await kdf("somepassword", hashConfig)

  const authIdentity = await authModule.createAuthIdentities({
    app_metadata: {
      user_id: user.id,
    },
    provider_identities: [
      {
        entity_id: "admin@medusa.js",
        provider: "emailpass",
        provider_metadata: {
          password: Buffer.from(passwordHash).toString("base64"),
        },
      },
    ],
  })

  const jwtSecret = process.env["JWT_SECRET"]
  if (jwtSecret === undefined || jwtSecret.length === 0) {
    throw new Error(
      "JWT_SECRET is required to create an integration-test admin",
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

  return { authIdentity, user }
}

export const createStoreUser = async ({
  api,
  storeHeaders,
}: {
  api: TestApi
  storeHeaders: TestHeaders
}) => {
  const registerResponse: unknown = await api.post(
    "/auth/customer/emailpass/register",
    {
      email: TEST_CUSTOMER_EMAIL,
      password: "password",
    },
  )
  const { data: registerData } = authResponseSchema.parse(registerResponse)

  const customerResponse: unknown = await api.post(
    "/store/customers",
    { email: TEST_CUSTOMER_EMAIL },
    {
      headers: {
        Authorization: `Bearer ${registerData.token}`,
        ...storeHeaders.headers,
      },
    },
  )
  const { data: customerData } = customerResponseSchema.parse(customerResponse)

  const loginResponse: unknown = await api.post("/auth/customer/emailpass", {
    email: TEST_CUSTOMER_EMAIL,
    password: "password",
  })
  const { data: loginData } = authResponseSchema.parse(loginResponse)

  return { customer: customerData.customer, token: loginData.token }
}
