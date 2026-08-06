import { redirect } from "next/navigation"

import { appHref } from "@/lib/routing"

interface ResetPasswordRedirectPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const appendSearchParam = (
  params: URLSearchParams,
  key: string,
  value: string | string[] | undefined,
) => {
  if (Array.isArray(value)) {
    const [firstValue] = value
    if (firstValue !== undefined && firstValue.length > 0) {
      params.set(key, firstValue)
    }
    return
  }

  if (typeof value === "string" && value.length > 0) {
    params.set(key, value)
  }
}

const resetPasswordRedirectPage = async ({
  searchParams,
}: ResetPasswordRedirectPageProps) => {
  const resolvedSearchParams = await searchParams
  const targetSearchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    appendSearchParam(targetSearchParams, key, value)
  }

  const queryString = targetSearchParams.toString()

  const targetPath =
    queryString.length > 0
      ? `/auth/reset-password?${queryString}`
      : "/auth/reset-password"

  redirect(appHref(targetPath))
}

export default resetPasswordRedirectPage
