import type {
  PhoneValidationRequest,
  PhoneValidationResult,
} from "@techsio/smart-suggest-validation/phone-lite"
import { act, createElement, type FocusEvent, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type CapturedPhoneInputProps = {
  children?: ReactNode
  defaultCountry?: string
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void
  onValueChange?: (details: CapturedPhoneValueDetails) => void
  validateStatus?: string
}

type CapturedPhoneValueDetails = {
  country: string
  value: string
}

const phoneInputProps = vi.hoisted(() => [] as CapturedPhoneInputProps[])
const statusTextChildren = vi.hoisted(() => [] as ReactNode[])
const strictValidatePhoneNumber = vi.hoisted(() => vi.fn())
const phoneStrictModuleLoads = vi.hoisted(() => ({ count: 0 }))

vi.mock("@techsio/ui-kit/molecules/phone-input", async () => {
  const React = await vi.importActual<typeof import("react")>("react")

  const PhoneInput = (props: CapturedPhoneInputProps) => {
    phoneInputProps.push(props)

    return React.createElement("div", null, props.children)
  }

  PhoneInput.Label = ({ children }: { children?: ReactNode }) =>
    React.createElement("label", null, children)
  PhoneInput.Control = ({ children }: { children?: ReactNode }) =>
    React.createElement("div", null, children)
  PhoneInput.CountryPicker = () => React.createElement("button")
  PhoneInput.Input = () => React.createElement("input", { type: "tel" })
  PhoneInput.StatusText = ({ children }: { children?: ReactNode }) => {
    statusTextChildren.push(children)

    return React.createElement("div", null, children)
  }

  return { PhoneInput }
})

vi.mock("@techsio/smart-suggest-validation/phone-strict", () => {
  phoneStrictModuleLoads.count += 1

  return {
    validatePhoneNumber: strictValidatePhoneNumber,
  }
})

import { PhoneValidationField } from "../src/phone-validation-field"

const roots: Root[] = []

const validPhoneResult = (rawInput: string): PhoneValidationResult => ({
  rawInput,
  displayValue: "+420 777 123 456",
  e164: "+420777123456",
  detectedCountry: "CZ",
  callingCode: "420",
  nationalNumber: "777123456",
  isPossible: true,
  isValid: true,
  errors: [],
})

const invalidPhoneResult = (rawInput: string): PhoneValidationResult => ({
  rawInput,
  displayValue: rawInput,
  isPossible: false,
  isValid: false,
  errors: [
    {
      code: "phone.invalid",
      field: "phone",
      message: "Enter a valid phone number.",
    },
  ],
})

const latestPhoneInputProps = () => {
  const props = phoneInputProps.at(-1)

  if (props === undefined) {
    throw new Error("PhoneInput was not rendered")
  }

  return props
}

const flushAsync = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

const renderPhoneValidationField = async (
  props: Partial<Parameters<typeof PhoneValidationField>[0]> = {}
) => {
  const container = document.createElement("div")
  const root = createRoot(container)

  document.body.append(container)
  roots.push(root)

  await act(() => {
    root.render(
      createElement(PhoneValidationField, {
        defaultCountry: "CZ",
        label: "Phone",
        ...props,
      })
    )
  })

  return { container, root }
}

const changePhoneValue = async (value: string, country = "CZ") => {
  await act(() => {
    latestPhoneInputProps().onValueChange?.({ country, value })
  })
}

const blurPhoneField = async () => {
  const currentTarget = document.createElement("div")

  await act(() => {
    latestPhoneInputProps().onBlur?.({
      currentTarget,
      relatedTarget: null,
    } as FocusEvent<HTMLDivElement>)
  })
}

describe("PhoneValidationField validation modes", () => {
  beforeEach(() => {
    phoneInputProps.length = 0
    statusTextChildren.length = 0
    strictValidatePhoneNumber.mockReset()
  })

  afterEach(() => {
    for (const root of roots.splice(0)) {
      act(() => {
        root.unmount()
      })
    }

    document.body.replaceChildren()
  })

  it("keeps default server-only mode from calling strict local validation", async () => {
    strictValidatePhoneNumber.mockReturnValue(validPhoneResult("+420777123456"))

    await renderPhoneValidationField()

    expect(phoneStrictModuleLoads.count).toBe(0)
    expect(strictValidatePhoneNumber).not.toHaveBeenCalled()
    expect(latestPhoneInputProps().validateStatus).toBe("default")

    await changePhoneValue("777 123 456")
    await flushAsync()

    expect(strictValidatePhoneNumber).not.toHaveBeenCalled()
    expect(latestPhoneInputProps().validateStatus).toBe("default")

    await blurPhoneField()
    await flushAsync()

    expect(phoneStrictModuleLoads.count).toBe(0)
    expect(strictValidatePhoneNumber).not.toHaveBeenCalled()
    expect(latestPhoneInputProps().validateStatus).toBe("default")
  })

  it("surfaces cheap server-only malformed feedback without strict validation", async () => {
    await renderPhoneValidationField()
    await changePhoneValue("not a phone")
    await blurPhoneField()
    await flushAsync()

    expect(phoneStrictModuleLoads.count).toBe(0)
    expect(strictValidatePhoneNumber).not.toHaveBeenCalled()
    expect(latestPhoneInputProps().validateStatus).toBe("error")
    expect(statusTextChildren.at(-1)).toBe(
      "Enter a phone number using digits and phone punctuation."
    )
  })

  it("defers server-only validation to a provided async validator", async () => {
    const serverValidatePhoneNumber = vi.fn(
      async (request: PhoneValidationRequest) =>
        validPhoneResult(request.rawInput)
    )
    const onValidationChange = vi.fn()

    await renderPhoneValidationField({
      onValidationChange,
      validatePhoneNumber: serverValidatePhoneNumber,
    })
    await changePhoneValue("777 123 456")
    await blurPhoneField()
    await flushAsync()

    expect(strictValidatePhoneNumber).not.toHaveBeenCalled()
    expect(phoneStrictModuleLoads.count).toBe(0)
    expect(serverValidatePhoneNumber).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultCountry: "CZ",
        rawInput: "777 123 456",
      })
    )
    expect(latestPhoneInputProps().validateStatus).toBe("success")
    expect(onValidationChange).toHaveBeenCalledWith(
      expect.objectContaining({ isValid: true })
    )
  })

  it("loads lazy frontend validation after interaction and validates on blur", async () => {
    strictValidatePhoneNumber.mockImplementation(
      (request: PhoneValidationRequest) => invalidPhoneResult(request.rawInput)
    )

    await renderPhoneValidationField({ validationMode: "frontend-lazy" })
    await changePhoneValue("not a phone")
    await flushAsync()

    expect(phoneStrictModuleLoads.count).toBeGreaterThan(0)
    expect(strictValidatePhoneNumber).not.toHaveBeenCalled()
    expect(latestPhoneInputProps().validateStatus).toBe("default")

    await blurPhoneField()
    await flushAsync()

    expect(strictValidatePhoneNumber).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultCountry: "CZ",
        rawInput: "not a phone",
      })
    )
    expect(latestPhoneInputProps().validateStatus).toBe("error")
    expect(statusTextChildren.at(-1)).toBe("Enter a valid phone number.")
  })

  it("validates immediate mode eagerly and clears stale errors on input", async () => {
    strictValidatePhoneNumber
      .mockImplementationOnce((request: PhoneValidationRequest) =>
        invalidPhoneResult(request.rawInput)
      )
      .mockImplementationOnce((request: PhoneValidationRequest) =>
        validPhoneResult(request.rawInput)
      )

    await renderPhoneValidationField({
      defaultValue: "not a phone",
      validationMode: "frontend-immediate",
    })
    await flushAsync()

    expect(strictValidatePhoneNumber).toHaveBeenCalledTimes(1)
    expect(latestPhoneInputProps().validateStatus).toBe("error")

    await changePhoneValue("+420777123456")

    expect(latestPhoneInputProps().validateStatus).toBe("default")
    expect(strictValidatePhoneNumber).toHaveBeenCalledTimes(1)

    await blurPhoneField()
    await flushAsync()

    expect(strictValidatePhoneNumber).toHaveBeenCalledTimes(2)
    expect(latestPhoneInputProps().validateStatus).toBe("success")
  })
})
