import { isRecord, getRecordValue } from "@techsio/std/object"
import { NextResponse } from "next/server"

import {
  normalizeCountryCode,
  normalizeRegionId,
  REGION_COUNTRY_CODE_STORAGE_KEY,
  REGION_STORAGE_KEY,
} from "@/lib/storefront/region-preferences"

const REGION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const invalidPreferenceResponse = () =>
  NextResponse.json({ code: "INVALID_REGION_PREFERENCE" }, { status: 400 })

const post = async (request: Request) => {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return invalidPreferenceResponse()
  }

  if (!isRecord(payload)) {
    return invalidPreferenceResponse()
  }

  const regionIdValue = getRecordValue(payload, "regionId")
  const countryCodeValue = getRecordValue(payload, "countryCode")
  const regionId = normalizeRegionId(
    typeof regionIdValue === "string" ? regionIdValue : null,
  )
  const countryCode = normalizeCountryCode(
    typeof countryCodeValue === "string" ? countryCodeValue : null,
  )

  if (regionId === null || countryCode === null) {
    return invalidPreferenceResponse()
  }

  const response = NextResponse.json({ success: true })
  const cookieOptions = {
    httpOnly: false,
    maxAge: REGION_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  } satisfies Parameters<typeof response.cookies.set>[2]

  response.cookies.set(REGION_STORAGE_KEY, regionId, cookieOptions)
  response.cookies.set(
    REGION_COUNTRY_CODE_STORAGE_KEY,
    countryCode,
    cookieOptions,
  )

  return response
}

export { post as POST }
