"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { buildLoginHref } from "@/lib/auth-redirect"
import { AccountProvider } from "./context/account-context"

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { customer, isAuthenticated, isFetching, isLoading, error } = useAuth()
  const [isHydrated, setIsHydrated] = useState(false)
  const loginHref = buildLoginHref(pathname ?? "/ucet", searchParams.toString())

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!(isHydrated && !isLoading && !isFetching)) {
      return
    }

    if (!(error || isAuthenticated)) {
      router.push(loginHref)
    }
  }, [
    error,
    isAuthenticated,
    isFetching,
    isHydrated,
    isLoading,
    loginHref,
    router,
  ])

  if (!(isHydrated && !isLoading && !isFetching)) {
    return <main className="mx-auto w-full max-w-5xl px-400 py-400" />
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-5xl px-400 py-400">
        <p className="text-fg-secondary">
          Nepodařilo se načíst účet. Zkuste prosím obnovit stránku.
        </p>
      </main>
    )
  }

  if (!customer) {
    return null
  }

  return (
    <AccountProvider>
      <main className="mx-auto w-full max-w-5xl px-400 py-400">{children}</main>
    </AccountProvider>
  )
}
