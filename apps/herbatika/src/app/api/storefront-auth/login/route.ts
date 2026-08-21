import {
  authenticatedCustomerResponse,
  badRequest,
  buildErrorResponse,
  buildMedusaUrl,
  fetchAuthenticatedCustomer,
  marketAuthorityError,
  parseResponseJson,
  requireStorefrontAuthContext,
  type StorefrontAuthContext,
  StorefrontMarketAuthorityError,
  serverError,
} from "../_lib"

type LoginBody = {
  email?: string
  password?: string
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

  const { messages } = context
  let body: LoginBody

  try {
    body = (await request.json()) as LoginBody
  } catch {
    return badRequest(messages.invalidJson)
  }

  const email = body.email?.trim()
  const password = body.password

  if (!(email && password)) {
    return badRequest(messages.emailAndPasswordRequired)
  }

  try {
    const medusaResponse = await fetch(
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

    if (!medusaResponse.ok) {
      return buildErrorResponse(medusaResponse, messages)
    }

    const payload = await parseResponseJson(medusaResponse)
    const token =
      payload && typeof payload.token === "string" ? payload.token : null

    if (!token) {
      return serverError(messages.customerLoginTokenMissing)
    }

    const customer = await fetchAuthenticatedCustomer(context.binding, token)
    if (!customer) {
      return serverError(messages.sessionRestoreFailed)
    }

    return authenticatedCustomerResponse(customer, token)
  } catch {
    return serverError(messages.unableToReachAuthenticationService)
  }
}
