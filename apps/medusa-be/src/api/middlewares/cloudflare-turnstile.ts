import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  getAllowedTurnstileHostnames,
  isTurnstileHostnameAllowed,
  removeTurnstileTokenFields,
  verifyTurnstileToken,
} from "./cloudflare-turnstile-helpers"
import {
  DEFAULT_TURNSTILE_TOKEN_FIELDS,
  normalizeTurnstileSecret,
  normalizeTurnstileToken,
} from "./cloudflare-turnstile-normalizers"

type CloudflareTurnstileOptions = {
  secretKeyEnv?: string
  tokenFields?: readonly string[]
}

type CaptchaErrorOptions = {
  message: string
  status: number
}

class CaptchaError extends Error {
  status: number

  constructor({ message, status }: CaptchaErrorOptions) {
    super(message)
    this.name = "CaptchaError"
    this.status = status
  }
}

export function verifyCloudflareTurnstile(
  options: CloudflareTurnstileOptions = {}
) {
  const secretKeyEnv = options.secretKeyEnv ?? "CLOUDFLARE_TURNSTILE_SECRET_KEY"
  const tokenFields = options.tokenFields ?? DEFAULT_TURNSTILE_TOKEN_FIELDS

  return async function cloudflareTurnstileMiddleware(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) {
    try {
      const token = normalizeTurnstileToken(req.body, tokenFields)
      removeTurnstileTokenFields(req.body, tokenFields)

      if (!token) {
        throw new CaptchaError({
          message: "Captcha token is required",
          status: 400,
        })
      }

      const secretKey = normalizeTurnstileSecret(process.env[secretKeyEnv])

      if (!secretKey) {
        throw new CaptchaError({
          message: "Captcha verification is not configured",
          status: 500,
        })
      }

      const verification = await verifyTurnstileToken(token, req, secretKey)
      const hostnameAllowed = isTurnstileHostnameAllowed(
        verification,
        getAllowedTurnstileHostnames()
      )

      if (!(verification.success && hostnameAllowed)) {
        throw new CaptchaError({
          message: "Captcha verification failed",
          status: 400,
        })
      }

      return next()
    } catch (error) {
      const captchaError =
        error instanceof CaptchaError
          ? error
          : new CaptchaError({
              message: "Captcha verification failed",
              status: 400,
            })

      return res.status(captchaError.status).json({
        code: "captcha_verification_failed",
        message: captchaError.message,
        type: "invalid_data",
      })
    }
  }
}
