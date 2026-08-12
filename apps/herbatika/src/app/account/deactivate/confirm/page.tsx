import type { Metadata } from "next"
import { Suspense } from "react"
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

async function AccountDeactivationConfirmationContent({
  searchParams,
}: AccountDeactivationConfirmationPageProps) {
  const resolvedSearchParams = await searchParams

  return (
    <AccountDeactivationConfirmation
      token={resolveSearchParam(resolvedSearchParams.token) ?? ""}
    />
  )
}

function AccountDeactivationConfirmationFallback() {
  return (
    <main className="mx-auto w-full max-w-max-w p-account-page 2xl:p-account-page-lg">
      <section
        aria-live="polite"
        className="mx-auto max-w-auth-content rounded-lg border border-border-secondary bg-surface p-550"
      >
        <p className="text-fg-secondary text-sm">
          Načítava sa potvrdenie zrušenia účtu.
        </p>
      </section>
    </main>
  )
}

export default function AccountDeactivationConfirmationPage({
  searchParams,
}: AccountDeactivationConfirmationPageProps) {
  return (
    <Suspense fallback={<AccountDeactivationConfirmationFallback />}>
      <AccountDeactivationConfirmationContent searchParams={searchParams} />
    </Suspense>
  )
}
