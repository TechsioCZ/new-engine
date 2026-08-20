import { NextResponse } from "next/server"
import {
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
  return response
}

const parseRegisterBody = async (
  request: Request,
  {
    currencyCode,
    messages,
  }: {
    currencyCode: string
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

  if (!(email && password)) {
    return {
      error: badRequest(messages.emailAndPasswordRequired),
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

  return {
    error: null,
    value: {
      email,
      password,
      firstName: asStringOrUndefined(body.first_name),
      lastName: asStringOrUndefined(body.last_name),
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

  try {
    const parsedBody = await parseRegisterBody(request, {
      currencyCode,
      messages,
    })
    if (parsedBody.error) {
      return parsedBody.error
    }

    const { email, firstName, lastName, password, wholesale } = parsedBody.value
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
