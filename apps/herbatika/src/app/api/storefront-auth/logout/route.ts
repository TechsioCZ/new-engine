import { NextResponse } from "next/server"

import { clearSessionTokenCookie } from "../auth-route-utils"

interface LogoutResponse {
  ok: true
}

const post = () => {
  const response = NextResponse.json<LogoutResponse>(
    { ok: true },
    { status: 200 },
  )
  clearSessionTokenCookie(response)
  return response
}

export { post as POST }
