import { afterEach, describe, expect, it, vi } from "vitest"

import {
  attachSmartSuggest,
  installSmartSuggestGlobal,
  type SmartSuggestVanillaFetch,
  type SmartSuggestVanillaWindow,
} from "../src/index"

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: init?.status ?? 200,
    statusText: init?.statusText,
  })

const waitFor = async <TResult>(read: () => TResult) => {
  let lastError: unknown

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return read()
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  throw lastError ?? new Error("Timed out waiting for assertion.")
}

const addInput = (id: string, value = "") => {
  const input = document.createElement("input")
  input.id = id
  input.value = value
  document.body.append(input)
  return input
}

const smartSuggestWindow = () => window as SmartSuggestVanillaWindow

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  smartSuggestWindow().TechsioSmartSuggest = undefined
})

describe("attachSmartSuggest", () => {
  it("renders address suggestions, fills fields, and records accept telemetry", async () => {
    const address = addInput("address", "Vaclav")
    const city = addInput("city")
    const postalCode = addInput("postal-code")
    const country = addInput("country", "CZ")
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      const url = String(input)

      if (url.includes("/v1/suggest")) {
        return Promise.resolve(
          jsonResponse({
            cacheStatus: "miss",
            requestId: "request-1",
            suggestions: [
              {
                address: {
                  city: "Praha",
                  countryCode: "CZ",
                  houseNumber: "832",
                  orientationNumber: "19",
                  postalCode: "110 00",
                  street: "Václavské náměstí",
                },
                confidence: 0.95,
                displayLabel: "Václavské náměstí 832/19, 110 00 Praha",
                id: "cz-ruian-vaclavske",
                kind: "address",
                source: {
                  id: "ruian-cz",
                  kind: "owned-dataset",
                  name: "RUIAN",
                },
              },
            ],
          })
        )
      }

      return Promise.resolve(jsonResponse({ accepted: true }))
    })
    const selected = vi.fn()

    attachSmartSuggest({
      addressLine: address,
      apiBaseUrl: "/smart-api",
      city,
      country,
      debounceMs: 0,
      fetch: fetchMock,
      onSuggestionSelect: selected,
      postalCode,
    })
    address.dispatchEvent(new Event("input", { bubbles: true }))

    const option = await waitFor(() => {
      const button = document.querySelector("button")
      expect(button).toBeInstanceOf(HTMLButtonElement)
      return button as HTMLButtonElement
    })
    option.click()

    expect(address.value).toBe("Václavské náměstí 832/19")
    expect(city.value).toBe("Praha")
    expect(postalCode.value).toBe("110 00")
    expect(country.value).toBe("CZ")
    expect(selected).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "request-1" })
    )
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/smart-api/v1/accept",
        expect.objectContaining({ method: "POST" })
      )
    )
  })

  it("normalizes phone and postal fields on blur without blocking the form", async () => {
    const phone = addInput("phone", "+420777123456")
    const postalCode = addInput("postal-code", "12345")
    const country = addInput("country", "CZ")
    const fetchMock = vi.fn<SmartSuggestVanillaFetch>((input) => {
      const url = String(input)

      if (url.endsWith("/phone")) {
        return Promise.resolve(
          jsonResponse({
            displayValue: "+420 777 123 456",
            errors: [],
            isValid: true,
          })
        )
      }

      return Promise.resolve(
        jsonResponse({
          displayValue: "123 45",
          errors: [],
          isValid: true,
        })
      )
    })

    attachSmartSuggest({
      country,
      fetch: fetchMock,
      phone,
      postalCode,
    })
    phone.dispatchEvent(new FocusEvent("blur"))
    postalCode.dispatchEvent(new FocusEvent("blur"))

    await waitFor(() => expect(phone.value).toBe("+420 777 123 456"))
    await waitFor(() => expect(postalCode.value).toBe("123 45"))
  })

  it("installs the legacy global browser API", () => {
    const api = installSmartSuggestGlobal(smartSuggestWindow())

    expect(smartSuggestWindow().TechsioSmartSuggest).toBe(api)
    expect(smartSuggestWindow().TechsioSmartSuggest?.attach).toBe(
      attachSmartSuggest
    )
  })
})
