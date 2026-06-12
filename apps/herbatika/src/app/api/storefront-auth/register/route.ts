import { NextResponse } from "next/server"
import {
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  getPublishableHeaders,
  parseResponseJson,
  serverError,
  setSessionTokenCookie,
} from "../_lib"

type RegisterBody = {
  email?: string
  password?: string
  first_name?: string
  last_name?: string
}

type RegisterResponse = {
  token: string
}

const asStringOrUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const isConflictStatus = (status: number) => status === 409

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

const parseRegisterBody = async (request: Request) => {
  const body = (await request.json()) as RegisterBody
  const email = asStringOrUndefined(body.email)
  const password = asStringOrUndefined(body.password)

  if (!(email && password)) {
    return {
      error: badRequest("E-mail aj heslo sú povinné."),
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
    },
  }
}

const refreshCustomerToken = async (loginToken: string) => {
  const refreshResponse = await fetch(buildMedusaUrl("/auth/token/refresh"), {
    method: "POST",
    headers: {
      authorization: `Bearer ${loginToken}`,
    },
    cache: "no-store",
  })

  if (!refreshResponse.ok) {
    return loginToken
  }

  const refreshPayload = await parseResponseJson(refreshResponse)
  return refreshPayload && typeof refreshPayload.token === "string"
    ? refreshPayload.token
    : loginToken
}

export async function POST(request: Request) {
  try {
    const parsedBody = await parseRegisterBody(request)
    if (parsedBody.error) {
      return parsedBody.error
    }

    const { email, firstName, lastName, password } = parsedBody.value
    const registerResponse = await fetch(
      buildMedusaUrl("/auth/customer/emailpass/register"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
        cache: "no-store",
      }
    )

    if (!registerResponse.ok) {
      return buildErrorResponse(registerResponse)
    }

    const loginResponse = await fetch(
      buildMedusaUrl("/auth/customer/emailpass"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
        cache: "no-store",
      }
    )

    if (!loginResponse.ok) {
      return buildErrorResponse(loginResponse)
    }

    const loginPayload = await parseResponseJson(loginResponse)
    const loginToken =
      loginPayload && typeof loginPayload.token === "string"
        ? loginPayload.token
        : null

    if (!loginToken) {
      return serverError(
        "Prihlásenie zákazníka prebehlo úspešne, ale token nebol vrátený."
      )
    }

    const createCustomerResponse = await fetch(
      buildMedusaUrl("/store/customers"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${loginToken}`,
          ...getPublishableHeaders(),
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
        }),
        cache: "no-store",
      }
    )

    if (
      !(
        createCustomerResponse.ok ||
        isConflictStatus(createCustomerResponse.status)
      )
    ) {
      return buildErrorResponse(createCustomerResponse)
    }

    return createRegisterResponse(await refreshCustomerToken(loginToken))
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest("Telo požiadavky musí byť platné JSON.")
    }

    return serverError("Nepodarilo sa dokončiť registráciu zákazníka.", {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
