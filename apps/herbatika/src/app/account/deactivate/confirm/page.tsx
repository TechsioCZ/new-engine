import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { AccountDeactivationConfirmation } from "@/components/account/account-deactivation-confirmation"

interface AccountDeactivationConfirmationPageProps {
  searchParams: Promise<{
    token?: string | string[]
  }>
}

export const generateMetadata = async (): Promise<Metadata> => {
  const tAuth = await getTranslations("auth")

  return {
    title: tAuth("account.deactivation.metadata_title"),
  }
}

const resolveSearchParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value

const AccountDeactivationConfirmationPage = async ({
  searchParams,
}: AccountDeactivationConfirmationPageProps) => {
  const resolvedSearchParams = await searchParams

  return (
    <AccountDeactivationConfirmation
      token={resolveSearchParam(resolvedSearchParams.token) ?? ""}
    />
  )
}

export default AccountDeactivationConfirmationPage
