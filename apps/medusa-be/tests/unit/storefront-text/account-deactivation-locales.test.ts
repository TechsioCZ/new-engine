import { describe, expect, it } from "vitest"

import { getResendTemplateSubject } from "../../../src/modules/resend/templates"
import {
  getStorefrontTextDefaultMessages,
  STOREFRONT_TEXT_MARKETS,
} from "../../../src/modules/storefront-text/registry"
import type { StorefrontTextKey } from "../../../src/modules/storefront-text/registry"

const ACCOUNT_DEACTIVATION_KEYS = [
  "auth.account.deactivation.metadata_title",
  "auth.account.deactivation.section.title",
  "auth.account.deactivation.section.description",
  "auth.account.deactivation.section.sent_status",
  "auth.account.deactivation.section.request_action",
  "auth.account.deactivation.section.resend_action",
  "auth.account.deactivation.dialog.title",
  "auth.account.deactivation.dialog.intro",
  "auth.account.deactivation.dialog.link_expiry",
  "auth.account.deactivation.dialog.confirmation_required",
  "auth.account.deactivation.dialog.orders_preserved",
  "auth.account.deactivation.dialog.keep_action",
  "auth.account.deactivation.dialog.submit_action",
  "auth.account.deactivation.dialog.loading",
  "auth.account.deactivation.toast.title",
  "auth.account.deactivation.toast.description",
  "auth.account.deactivation.confirmation.title",
  "auth.account.deactivation.confirmation.description",
  "auth.account.deactivation.confirmation.success",
  "auth.account.deactivation.confirmation.store_action",
  "auth.account.deactivation.confirmation.confirm_action",
  "auth.account.deactivation.confirmation.loading",
  "auth.account.deactivation.errors.request_failed",
  "auth.account.deactivation.errors.invalid_token",
  "auth.account.deactivation.errors.confirmation_failed",
] as const satisfies readonly StorefrontTextKey[]

const EXPECTED_METADATA_TITLES = {
  cz: "Potvrzení zrušení účtu",
  hu: "A fiók megszüntetésének megerősítése",
  ro: "Confirmarea dezactivării contului",
  sk: "Potvrdenie zrušenia účtu",
} as const

describe("account deactivation localization", () => {
  it("provides every account deactivation message for every market", () => {
    for (const { market } of STOREFRONT_TEXT_MARKETS) {
      const messages = getStorefrontTextDefaultMessages({ market })

      for (const key of ACCOUNT_DEACTIVATION_KEYS) {
        expect(messages[key], `${key} (${market})`).toBeTypeOf("string")
        expect(messages[key]?.trim(), `${key} (${market})`).not.toBe("")
      }
    }
  })

  it("uses the localized confirmation title for each market", () => {
    for (const { market } of STOREFRONT_TEXT_MARKETS) {
      const messages = getStorefrontTextDefaultMessages({ market })

      expect(messages["auth.account.deactivation.metadata_title"]).toBe(
        EXPECTED_METADATA_TITLES[market],
      )
    }
  })

  it("uses a neutral subject while notification data has no market locale", () => {
    expect(getResendTemplateSubject("customer-account-deactivation")).toBe(
      "Confirm account deactivation",
    )
  })
})
