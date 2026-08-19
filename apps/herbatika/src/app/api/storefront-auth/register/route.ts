import { NextResponse } from "next/server"
import { HERBATIKA_STOREFRONT_NAMESPACE } from "@/lib/storefront/market-context"
import { resolveMarketContextFromHeaders } from "@/lib/storefront/market-context.server"
import { getRegionServerContext } from "@/lib/storefront/ssr/context"
import { badRequest, serverError, setSessionTokenCookie } from "../_lib"
import { asRecordOrUndefined, asStringOrUndefined } from "./parse-utils"
import {
  createCustomerIdentity,
  createCustomerProfile,
  createWholesaleProfile,
  loginCustomerIdentity,
  type ParsedRegisterPayload,
  type RegistrationMarketContext,
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
  currencyCode: string
): Promise<ParseRegisterBodyResult> => {
  const body = asRecordOrUndefined(await request.json()) as
    | RegisterBody
    | undefined

  if (!body) {
    return {
      error: badRequest("Telo požiadavky musí byť platný JSON objekt."),
      value: null,
    }
  }

  const email = asStringOrUndefined(body.email)
  const password = asStringOrUndefined(body.password)

  if (!(email && password)) {
    return {
      error: badRequest("E-mail aj heslo sú povinné."),
      value: null,
    }
  }

  const wholesale = parseWholesaleRegistration(body.wholesale, { currencyCode })
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
  try {
    const requestMarketContext = resolveMarketContextFromHeaders(
      request.headers
    )
    if (!requestMarketContext) {
      return badRequest("Doména obchodu nezodpovedá podporovanému trhu.")
    }

    const { marketContext, region } = await getRegionServerContext({
      marketContext: requestMarketContext,
    })
    if (!region) {
      return serverError("Trh obchodu nemá nakonfigurovaný región.")
    }

    const registrationMarketContext: RegistrationMarketContext = {
      marketCode: marketContext.code,
      regionId: region.region_id,
      salesChannelId: region.salesChannelId,
      storefrontNamespace: HERBATIKA_STOREFRONT_NAMESPACE,
    }
    const parsedBody = await parseRegisterBody(request, region.currency_code)
    if (parsedBody.error) {
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
    if (loginResult.error) {
      return loginResult.error
    }

    const createCustomerError = await createCustomerProfile({
      loginToken: loginResult.token,
      marketContext: registrationMarketContext,
      payload: {
        email,
        firstName,
        lastName,
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
