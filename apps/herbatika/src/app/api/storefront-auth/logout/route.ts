import { NextResponse } from "next/server"
import {
  applyStorefrontAuthResponsePolicy,
  clearSessionTokenCookie,
  marketAuthorityError,
  requireStorefrontMarketBinding,
  StorefrontMarketAuthorityError,
} from "../_lib"

type LogoutResponse = {
  ok: true
}

export function POST(request: Request) {
  try {
    requireStorefrontMarketBinding(request)
  } catch (error) {
    if (error instanceof StorefrontMarketAuthorityError) {
      return marketAuthorityError()
    }
    throw error
  }
  const response = NextResponse.json<LogoutResponse>(
    { ok: true },
    { status: 200 }
  )
  clearSessionTokenCookie(response)
  return applyStorefrontAuthResponsePolicy(response)
}
