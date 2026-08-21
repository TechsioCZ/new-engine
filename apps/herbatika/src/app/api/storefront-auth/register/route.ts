import { NextResponse } from "next/server"
import {
  getAuthPasswordPolicyViolation,
  isRegistrationCompanyIdentifierValid,
  isRegistrationCompanyNameValid,
  isRegistrationNameValid,
  isRegistrationPostalCodeValid,
  isRegistrationTermsAcceptanceValid,
  normalizeRegistrationCountryCode,
  REGISTRATION_TERMS_VERSION,
} from "@/lib/auth/registration-policy"
import type { HerbatikaCountryCode } from "@/lib/storefront/market-context"
import {
  applyStorefrontAuthResponsePolicy,
  badRequest,
  marketAuthorityError,
  requireStorefrontAuthContext,
  type StorefrontAuthContext,
  type StorefrontAuthMessages,
  StorefrontMarketAuthorityError,
  serverError,
  setSessionTokenCookie,
} from "../_lib"
import { asRecordOrUndefined, asStringOrUndefined } from "./parse-utils"
import {
  createCustomerIdentity,
  createCustomerProfile,
  createWholesaleProfile,
  loginCustomerIdentity,
  type ParsedRegisterPayload,
  refreshCustomerToken,
} from "./register-flow"
import { parseWholesaleRegistration } from "./wholesale"

type RegisterBody = {
  email?: string
  password?: string
  first_name?: string
  last_name?: string
  accept_terms?: unknown
  terms_version?: unknown
  wholesale?: unknown
}

type RegisterResponse = {
  token: string
}

type ParseRegisterBodyResult =
  | {
      error: NextResponse
      value: null
    }
  | {
      error: null
      value: ParsedRegisterPayload
    }

const createRegisterResponse = (token: string) => {
  const response = NextResponse.json<RegisterResponse>(
    {
      token,
    },
    { status: 200 }
  )

  setSessionTokenCookie(response, token)
  return applyStorefrontAuthResponsePolicy(response)
}

const parseRegisterBody = async (
  request: Request,
  {
    currencyCode,
    countryCode,
    messages,
  }: {
    currencyCode: string
    countryCode: HerbatikaCountryCode
    messages: StorefrontAuthMessages
  }
): Promise<ParseRegisterBodyResult> => {
  const body = asRecordOrUndefined(await request.json()) as
    | RegisterBody
    | undefined

  if (!body) {
    return {
      error: badRequest(messages.invalidJsonObject),
      value: null,
    }
  }

  const email = asStringOrUndefined(body.email)
  const password = asStringOrUndefined(body.password)
  const firstName = asStringOrUndefined(body.first_name)
  const lastName = asStringOrUndefined(body.last_name)

  if (!(email && password)) {
    return {
      error: badRequest(messages.emailAndPasswordRequired),
      value: null,
    }
  }

  if (
    getAuthPasswordPolicyViolation(password) ||
    !isRegistrationNameValid(firstName) ||
    !isRegistrationNameValid(lastName) ||
    !isRegistrationTermsAcceptanceValid(body.accept_terms, body.terms_version)
  ) {
    return {
      error: badRequest(messages.registrationFailed),
      value: null,
    }
  }

  const wholesale = parseWholesaleRegistration(body.wholesale, {
    currencyCode,
    messages,
  })
  if (wholesale.error) {
    return {
      error: wholesale.error,
      value: null,
    }
  }

  if (
    wholesale.value &&
    !(
      isRegistrationCompanyNameValid(wholesale.value.companyName) &&
      isRegistrationCompanyIdentifierValid(wholesale.value.companyIdentifier) &&
      isRegistrationPostalCodeValid(
        wholesale.value.billingAddress.postalCode,
        countryCode
      )
    )
  ) {
    return {
      error: badRequest(messages.registrationFailed),
      value: null,
    }
  }

  return {
    error: null,
    value: {
      email,
      password,
      firstName,
      lastName,
      termsAcceptance: {
        acceptedAt: new Date().toISOString(),
        version: REGISTRATION_TERMS_VERSION,
      },
      wholesale: wholesale.value,
    } satisfies ParsedRegisterPayload,
  }
}

export async function POST(request: Request) {
  let context: StorefrontAuthContext

  try {
    context = requireStorefrontAuthContext(request)
  } catch (error) {
    if (error instanceof StorefrontMarketAuthorityError) {
      return marketAuthorityError()
    }
    throw error
  }

  const { binding, currencyCode, messages } = context
  const countryCode = normalizeRegistrationCountryCode(binding.countryCode)
  if (!countryCode) {
    return serverError(messages.registrationFailed)
  }

  try {
    const parsedBody = await parseRegisterBody(request, {
      currencyCode,
      countryCode,
      messages,
    })
    if (parsedBody.error) {
      return parsedBody.error
    }

    const { email, firstName, lastName, password, termsAcceptance, wholesale } =
      parsedBody.value
    const registerError = await createCustomerIdentity({
      email,
      messages,
      password,
      wholesale,
    })
    if (registerError) {
      return registerError
    }

    const loginResult = await loginCustomerIdentity({
      email,
      messages,
      password,
    })
    if (loginResult.error) {
      return loginResult.error
    }

    const createCustomerError = await createCustomerProfile({
      binding,
      loginToken: loginResult.token,
      messages,
      payload: {
        email,
        firstName,
        lastName,
        marketCode: binding.market,
        termsAcceptance,
        wholesale,
      },
    })
    if (createCustomerError) {
      return createCustomerError
    }

    const sessionToken = await refreshCustomerToken(loginResult.token)
    const companyError = await createWholesaleProfile({
      binding,
      email,
      messages,
      sessionToken,
      wholesale,
    })
    if (companyError) {
      return companyError
    }

    return createRegisterResponse(sessionToken)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest(messages.invalidJson)
    }

    return serverError(messages.registrationFailed)
  }
}
