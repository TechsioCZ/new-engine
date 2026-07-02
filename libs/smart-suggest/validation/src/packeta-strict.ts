import type { SmartSuggestCountryCode } from "@techsio/smart-suggest-core"

import { validatePhoneNumber } from "./phone-strict"
import type {
  PhoneValidationPolicy,
  PhoneValidationRequest,
  PhoneValidationResult,
  ValidationIssue,
} from "./phone-lite"

export type PacketaDeliveryType = "home-delivery" | "pickup-point"

export type PacketaValidationPolicy = PhoneValidationPolicy & {
  deliveryType: PacketaDeliveryType
}

export type PacketaContactValidationRequest = PacketaValidationPolicy & {
  phone?: string
  defaultCountry?: SmartSuggestCountryCode
}

export type PacketaContactValidationResult = {
  deliveryType: PacketaDeliveryType
  isValid: boolean
  phone: PhoneValidationResult
  fieldErrors: Record<"phone", readonly ValidationIssue[]>
}

const shouldRequireMobileForPacketa = (deliveryType: PacketaDeliveryType) =>
  deliveryType === "pickup-point"

export const validatePacketaContactStrict = (
  request: PacketaContactValidationRequest
): PacketaContactValidationResult => {
  const phoneRequest: PhoneValidationRequest = {
    rawInput: request.phone ?? "",
    requireMobile:
      request.requireMobile ??
      shouldRequireMobileForPacketa(request.deliveryType),
  }

  if (request.defaultCountry !== undefined) {
    phoneRequest.defaultCountry = request.defaultCountry
  }

  if (request.allowedCountries !== undefined) {
    phoneRequest.allowedCountries = request.allowedCountries
  }

  if (request.requireCountryMatch !== undefined) {
    phoneRequest.requireCountryMatch = request.requireCountryMatch
  }

  const phone = validatePhoneNumber(phoneRequest)

  return {
    deliveryType: request.deliveryType,
    isValid: phone.isValid,
    phone,
    fieldErrors: { phone: phone.errors },
  }
}

export const validatePacketaContact = validatePacketaContactStrict
