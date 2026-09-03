import { describe, expect, it, vi } from "vitest"
import { resolveCompleteCartFailure } from "./checkout-completion.utils"
import {
  readCheckoutErrorDiagnostic,
  reportCheckoutError,
  resolveCheckoutCustomerErrorMessage,
} from "./checkout-customer-error"

const roMessages = {
  cartUnavailable: "Coșul nu mai este disponibil.",
  insufficientInventory: "Cantitatea solicitată nu mai este disponibilă.",
  paymentAuthorizationFailed: "Plata nu a fost autorizată.",
}

const skMessages = {
  cartUnavailable: "Košík už nie je dostupný.",
  insufficientInventory: "Požadované množstvo už nie je dostupné.",
  paymentAuthorizationFailed: "Platba nebola autorizovaná.",
}

describe("resolveCheckoutCustomerErrorMessage", () => {
  it("never leaks an English upstream message into Romanian checkout UI", () => {
    const fallback = "Finalizarea comenzii a eșuat."

    expect(
      resolveCheckoutCustomerErrorMessage(
        new Error("Internal payment provider request failed"),
        fallback,
        roMessages,
        "completion"
      )
    ).toBe(fallback)
  })

  it("never leaks a Slovak upstream message into Romanian checkout UI", () => {
    const fallback = "Salvarea adresei a eșuat."

    expect(
      resolveCheckoutCustomerErrorMessage(
        { message: "Uloženie adresy zlyhalo na serveri." },
        fallback,
        roMessages,
        "address"
      )
    ).toBe(fallback)
  })

  it("maps safe known codes to Romanian storefront messages", () => {
    expect(
      resolveCheckoutCustomerErrorMessage(
        { code: "out_of_stock", message: "Out of stock" },
        "Finalizarea comenzii a eșuat.",
        roMessages,
        "completion"
      )
    ).toBe(roMessages.insufficientInventory)

    expect(
      resolveCheckoutCustomerErrorMessage(
        {
          response: {
            data: { type: "PAYMENT_AUTHORIZATION_ERROR" },
            status: 409,
          },
        },
        "Finalizarea comenzii a eșuat.",
        roMessages,
        "completion"
      )
    ).toBe(roMessages.paymentAuthorizationFailed)
  })

  it("sanitizes the structured completion failure before customer display", () => {
    const completionFailure = resolveCompleteCartFailure({
      error: {
        code: "payment_authorization_error",
        message: "Payment session was not authorized with the provider",
        status: 409,
      },
      type: "cart",
    })

    expect(readCheckoutErrorDiagnostic(completionFailure)).toEqual({
      code: "payment_authorization_error",
      status: 409,
    })
    expect(
      resolveCheckoutCustomerErrorMessage(
        completionFailure,
        "Finalizarea comenzii a eșuat.",
        roMessages,
        "completion"
      )
    ).toBe(roMessages.paymentAuthorizationFailed)
  })

  it("keeps Slovak checkout customer-safe when upstream text is Romanian", () => {
    const fallback = "Dokončenie objednávky zlyhalo."

    expect(
      resolveCheckoutCustomerErrorMessage(
        { message: "Eroare internă a furnizorului de plată" },
        fallback,
        skMessages,
        "payment"
      )
    ).toBe(fallback)
  })

  it("retains code and status for diagnostics without returning raw UI text", () => {
    const error = {
      message: "Sensitive upstream detail",
      response: {
        data: { code: "cart-expired" },
        status: 404,
      },
    }

    expect(readCheckoutErrorDiagnostic(error)).toEqual({
      code: "cart_expired",
      status: 404,
    })
    expect(
      resolveCheckoutCustomerErrorMessage(
        error,
        "Coș indisponibil.",
        roMessages,
        "shipping"
      )
    ).toBe(roMessages.cartUnavailable)
  })

  it("does not classify a carrier authorization phrase as a payment error", () => {
    const fallback = "Setarea livrării a eșuat."
    const error = new Error("Request was not authorized with the provider")

    expect(
      resolveCheckoutCustomerErrorMessage(
        error,
        fallback,
        roMessages,
        "shipping"
      )
    ).toBe(fallback)
    expect(
      resolveCheckoutCustomerErrorMessage(
        error,
        "Finalizarea comenzii a eșuat.",
        roMessages,
        "completion"
      )
    ).toBe(roMessages.paymentAuthorizationFailed)
  })

  it("reads code and status through a nested storefront SDK cause", () => {
    const error = {
      cause: {
        response: {
          data: { type: "PAYMENT_AUTHORIZATION_ERROR" },
          status: 409,
        },
      },
      message: "Failed to initiate payment",
      stage: "payment",
    }

    expect(readCheckoutErrorDiagnostic(error)).toEqual({
      code: "payment_authorization_error",
      status: 409,
    })
    expect(
      resolveCheckoutCustomerErrorMessage(
        error,
        "Finalizarea comenzii a eșuat.",
        roMessages,
        "payment"
      )
    ).toBe(roMessages.paymentAuthorizationFailed)
  })
})

describe("reportCheckoutError", () => {
  it("keeps the original error in diagnostics", () => {
    const error = { code: "out_of_stock", message: "Out of stock" }
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      // Intentionally suppress the diagnostic during this unit test.
    })

    reportCheckoutError("completion", error)

    expect(consoleError).toHaveBeenCalledWith("Checkout completion failed", {
      code: "out_of_stock",
      error,
      status: null,
    })
    consoleError.mockRestore()
  })
})
