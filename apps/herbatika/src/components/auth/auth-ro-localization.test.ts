import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  createLoginValidators,
  resolveLoginSubmitError,
  resolveRegisterSubmitError,
} from "@/lib/auth/auth-form-validators"

const messages = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      "../medusa-be/src/modules/storefront-text/messages/ro-RO.json"
    ),
    "utf8"
  )
)

describe("Romanian authentication form copy", () => {
  it("uses the Romanian storefront-text validation messages", () => {
    const validators = createLoginValidators({
      emailInvalid: messages.form.validation.email_invalid,
      emailRequired: messages.form.validation.email_required,
      passwordRequired: messages.auth.validation.password_required,
    })

    expect(validators.email.onBlur({ value: "" })).toBe(
      "Introduceți adresa de e-mail."
    )
    expect(validators.email.onBlur({ value: "invalid" })).toBe(
      "Introduceți o adresă de e-mail validă."
    )
    expect(validators.password.onBlur({ value: "" })).toBe(
      "Introduceți parola."
    )
  })

  it("maps route failures back to the exact Romanian storefront-text copy", () => {
    expect(
      resolveLoginSubmitError(new Error("401"), {
        failed: messages.auth.login.failed,
        invalidCredentials: messages.auth.login.invalid_credentials,
      })
    ).toBe("Adresa de e-mail sau parola este incorectă.")

    expect(
      resolveRegisterSubmitError(
        new Error(
          "Există deja un cont cu această adresă de e-mail. Autentificați-vă sau folosiți recuperarea parolei."
        ),
        {
          emailExists: messages.auth.register.email_exists,
          failed: messages.auth.register.failed,
        }
      )
    ).toBe(
      "Există deja un cont cu această adresă de e-mail. Autentificați-vă sau folosiți recuperarea parolei."
    )
  })
})
