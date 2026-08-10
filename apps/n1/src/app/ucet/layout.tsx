"use client"

import { redirect } from "next/navigation"
import { useEffect } from "react"

import { useSuspenseAuth } from "@/hooks/use-auth"

import { AccountProvider } from "./context/account-context"

const AccountLayout = ({ children }: { children: React.ReactNode }) => {
  const { customer, isAuthenticated, isTokenExpired } = useSuspenseAuth()

  useEffect(() => {
    let timeout: number | null = null
    if (isTokenExpired) {
      timeout = window.setTimeout(() => {
        window.location.assign("/prihlaseni")
      }, 3000)
    }

    return () => {
      if (timeout !== null) {
        window.clearTimeout(timeout)
      }
    }
  }, [isTokenExpired])

  if (!isAuthenticated && !isTokenExpired) {
    redirect("/prihlaseni")
  }

  if (isTokenExpired) {
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

export default AccountLayout
