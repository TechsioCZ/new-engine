import { getRecordValue } from "@techsio/std/object"
import { NextResponse } from "next/server"

import {
  badRequest,
  serverError,
  setSessionTokenCookie,
} from "../auth-route-utils"
import { asRecordOrUndefined, asStringOrUndefined } from "./parse-utils"
import {
  createCustomerIdentity,
  createCustomerProfile,
  createWholesaleProfile,
  loginCustomerIdentity,
  refreshCustomerToken,
} from "./register-flow"
import type { ParsedRegisterPayload } from "./register-flow"
import { parseWholesaleRegistration } from "./wholesale"

interface RegisterResponse {
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
    { status: 200 },
  )

  setSessionTokenCookie(response, token)
  return response
}

const parseRegisterBody = async (
  request: Request,
): Promise<ParseRegisterBodyResult> => {
  const body = asRecordOrUndefined(await request.json())

  if (!body) {
    return {
      error: badRequest("Telo požiadavky musí byť platný JSON objekt."),
      value: null,
    }
  }

  const email = asStringOrUndefined(getRecordValue(body, "email"))
  const password = asStringOrUndefined(getRecordValue(body, "password"))

  if (email === undefined || password === undefined) {
    return {
      error: badRequest("E-mail aj heslo sú povinné."),
      value: null,
    }
  }

  const wholesale = parseWholesaleRegistration(
    getRecordValue(body, "wholesale"),
  )
  if (wholesale.error) {
    return {
      error: wholesale.error,
      value: null,
    }
  }

  const firstName = asStringOrUndefined(getRecordValue(body, "first_name"))
  const lastName = asStringOrUndefined(getRecordValue(body, "last_name"))

  return {
    error: null,
    value: {
      email,
      password,
      ...(firstName === undefined ? {} : { firstName }),
      ...(lastName === undefined ? {} : { lastName }),
      wholesale: wholesale.value,
    } satisfies ParsedRegisterPayload,
  }
}

const post = async (request: Request) => {
  try {
    const parsedBody = await parseRegisterBody(request)
    if (parsedBody.error !== null) {
      return parsedBody.error
    }

    const { email, firstName, lastName, password, wholesale } = parsedBody.value
    const registerError = await createCustomerIdentity({
      email,
      password,
      wholesale,
    })
    if (registerError) {
      return registerError
    }

    const loginResult = await loginCustomerIdentity({ email, password })
    if (loginResult.error !== null) {
      return loginResult.error
    }

    const createCustomerError = await createCustomerProfile({
      loginToken: loginResult.token,
      payload: {
        email,
        ...(firstName === undefined ? {} : { firstName }),
        ...(lastName === undefined ? {} : { lastName }),
        wholesale,
      },
    })
    if (createCustomerError) {
      return createCustomerError
    }

    const sessionToken = await refreshCustomerToken(loginResult.token)
    const companyError = await createWholesaleProfile({
      email,
      sessionToken,
      wholesale,
    })
    if (companyError) {
      return companyError
    }

    return createRegisterResponse(sessionToken)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("Telo požiadavky musí byť platné JSON.")
    }

    return serverError("Nepodarilo sa dokončiť registráciu zákazníka.", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

export { post as POST }
