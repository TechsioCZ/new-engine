"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AccountProvider } from "./context/account-context"

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { customer, isAuthenticated, isFetching, isLoading, isTokenExpired } =
    useAuth()
  const [isHydrated, setIsHydrated] = useState(false)
  const [showExpiredMessage, setShowExpiredMessage] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isTokenExpired) {
      return
    }

    setShowExpiredMessage(true)
    const timeout = setTimeout(() => {
      router.push("/prihlaseni")
    }, 3000)
    return () => clearTimeout(timeout)
  }, [isTokenExpired, router])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    if (!(isAuthenticated || isTokenExpired)) {
      router.push("/prihlaseni")
    }
  }, [isAuthenticated, isHydrated, isTokenExpired, router])

  if (!(isHydrated && !isLoading && !isFetching)) {
    return <main className="mx-auto w-full max-w-5xl px-400 py-400" />
  }

  if (showExpiredMessage) {
    return (
      <main className="mx-auto w-2xl max-w-full py-300">
        <div className="rounded bg-warning-light p-250">
          <div className="mb-100 font-semibold text-md text-warning">
            Platnost relace vypršela
          </div>
          <p className="text-sm text-warning">
            Vaše přihlášení vypršelo. Za chvíli budete přesměrováni na
            přihlašovací stránku...
          </p>
        </div>
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
