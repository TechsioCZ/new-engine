import type {
  ExecArgs,
  IAuthModuleService,
  IUserModuleService,
} from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"

const EMAIL_PASS_PROVIDER = "emailpass"

function maskEmailForLog(email: string): string {
  const [localPart = "", domain = ""] = email.split("@")
  if (!localPart || !domain) {
    return "<redacted>"
  }

  if (localPart.length <= 2) {
    return `**@${domain}`
  }

  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`
}

export default async function createInitialSuperadmin({
  container,
}: ExecArgs): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL?.trim()
  const password = process.env.SUPERADMIN_PASSWORD

  if (!email || !password) {
    console.log(
      "Skipping superadmin initialization: SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD is missing."
    )
    return
  }

  const userService = container.resolve<IUserModuleService>(Modules.USER)
  const authService = container.resolve<IAuthModuleService>(Modules.AUTH)

  const [existingUser] = await userService.listUsers(
    { email },
    {
      take: 1,
    }
  )

  const user = existingUser ?? (await userService.createUsers({ email }))

  const [existingAuthIdentity] = await authService.listAuthIdentities(
    {
      provider_identities: {
        provider: EMAIL_PASS_PROVIDER,
        entity_id: email,
      },
    },
    {
      take: 1,
    }
  )

  let authIdentity = existingAuthIdentity

  if (!authIdentity) {
    const registration = await authService.register(EMAIL_PASS_PROVIDER, {
      body: {
        email,
        password,
      },
    })

    if (registration.error || !registration.success) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to register superadmin auth identity: ${registration.error ?? "unknown error"}`
      )
    }

    if (!registration.authIdentity) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Failed to register superadmin auth identity."
      )
    }

    authIdentity = registration.authIdentity
  }

  const linkedUserId =
    typeof authIdentity.app_metadata?.user_id === "string"
      ? authIdentity.app_metadata.user_id
      : undefined

  if (linkedUserId !== user.id) {
    await authService.updateAuthIdentities({
      id: authIdentity.id,
      app_metadata: {
        ...(authIdentity.app_metadata ?? {}),
        user_id: user.id,
      },
    })
  }

  console.log(`Superadmin is ready: ${maskEmailForLog(email)}`)
}
