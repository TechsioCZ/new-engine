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
  const { customer, isAuthenticated, isFetching, isLoading, error } = useAuth()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!(isHydrated && !isLoading && !isFetching)) {
      return
    }

    if (!(error || isAuthenticated)) {
      router.push("/prihlaseni")
    }
  }, [error, isAuthenticated, isFetching, isHydrated, isLoading, router])

  if (!(isHydrated && !isLoading && !isFetching)) {
    return <main className="mx-auto w-full max-w-5xl px-400 py-400" />
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
