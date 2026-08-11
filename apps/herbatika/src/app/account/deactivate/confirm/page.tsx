import type { Metadata } from "next"
import { AccountDeactivationConfirmation } from "@/components/account/account-deactivation-confirmation"

type AccountDeactivationConfirmationPageProps = {
  searchParams: Promise<{
    token?: string | string[]
  }>
}

export const metadata: Metadata = {
  title: "Potvrdenie zrušenia účtu",
}

const resolveSearchParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value

export default async function AccountDeactivationConfirmationPage({
  searchParams,
}: AccountDeactivationConfirmationPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <AccountDeactivationConfirmation
      token={resolveSearchParam(resolvedSearchParams.token) ?? ""}
    />
  )
}
