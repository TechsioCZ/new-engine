import { redirect } from "next/navigation"

import { appHref } from "@/lib/routing"

type ResetPasswordRedirectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const appendSearchParam = (
  params: URLSearchParams,
  key: string,
  value: string | string[] | undefined
) => {
  if (Array.isArray(value)) {
    const firstValue = value[0]
    if (firstValue) {
      params.set(key, firstValue)
    }
    return
  }

  if (value) {
    params.set(key, value)
  }
}

export default async function ResetPasswordRedirectPage({
  searchParams,
}: ResetPasswordRedirectPageProps) {
  const resolvedSearchParams = await searchParams
  const targetSearchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    appendSearchParam(targetSearchParams, key, value)
  }

  const queryString = targetSearchParams.toString()

  redirect(
    appHref(`/auth/reset-password${queryString ? `?${queryString}` : ""}`)
  )
}
