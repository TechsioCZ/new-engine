import { describe, expect, it } from "vitest"
import { createAccountSettingsValidators } from "./account-settings-validators"

const messages = {
  firstNameMinLength: "first-name-min-length",
  lastNameMinLength: "last-name-min-length",
  phoneInvalid: "phone-invalid",
}

describe("account-settings phone validation", () => {
  it("validates the regional phone-number rules on submit", () => {
    const validators = createAccountSettingsValidators(messages, "cz")

    expect(validators.phone.onSubmit({ value: "4646646456" })).toBe(
      messages.phoneInvalid
    )
  })
})
