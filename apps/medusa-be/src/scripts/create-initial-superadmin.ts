import type {
  ExecArgs,
  IAuthModuleService,
  IUserModuleService,
} from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"

const EMAIL_PASS_PROVIDER = "emailpass"

const maskEmailForLog = (email: string): string => {
  const [localPart = "", domain = ""] = email.split("@")
  if (localPart === "" || domain === "") {
    return "<redacted>"
  }

  if (localPart.length <= 2) {
    return `**@${domain}`
  }

  return `${localPart[0]}***${localPart.at(-1)}@${domain}`
}

const createInitialSuperadmin = async ({
  container,
}: ExecArgs): Promise<void> => {
  const email = process.env["SUPERADMIN_EMAIL"]?.trim()
  const password = process.env["SUPERADMIN_PASSWORD"]

  if (
    email === undefined ||
    email === "" ||
    password === undefined ||
    password === ""
  ) {
    console.log(
      "Skipping superadmin initialization: SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD is missing.",
    )
    return
  }

  const userService = container.resolve<IUserModuleService>(Modules.USER)
  const authService = container.resolve<IAuthModuleService>(Modules.AUTH)

  const [existingUser] = await userService.listUsers(
    { email },
    {
      take: 1,
    },
  )

  const user = existingUser ?? (await userService.createUsers({ email }))

  const [existingAuthIdentity] = await authService.listAuthIdentities(
    {
      provider_identities: {
        entity_id: email,
        provider: EMAIL_PASS_PROVIDER,
      },
    },
    {
      take: 1,
    },
  )

  let authIdentity = existingAuthIdentity

  if (authIdentity === undefined) {
    const registration = await authService.register(EMAIL_PASS_PROVIDER, {
      body: {
        email,
        password,
      },
    })

    const {
      authIdentity: registeredAuthIdentity,
      error: registrationError,
      success: registrationSucceeded,
    } = registration
    if (registrationError !== undefined || !registrationSucceeded) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to register superadmin auth identity: ${registrationError ?? "unknown error"}`,
      )
    }

    if (registeredAuthIdentity === undefined) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Failed to register superadmin auth identity.",
      )
    }

    authIdentity = registeredAuthIdentity
  }

  const { app_metadata: appMetadata } = authIdentity
  const linkedUserId =
    typeof appMetadata?.["user_id"] === "string"
      ? appMetadata["user_id"]
      : undefined

  if (linkedUserId !== user.id) {
    await authService.updateAuthIdentities({
      app_metadata: {
        ...authIdentity.app_metadata,
        user_id: user.id,
      },
      id: authIdentity.id,
    })
  }

  console.log(`Superadmin is ready: ${maskEmailForLog(email)}`)
}

export default createInitialSuperadmin
