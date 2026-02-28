"use client"

import type { StoreCustomer } from "@medusajs/types"
import { useQueryClient } from "@tanstack/react-query"
import { createContext, type ReactNode, useContext, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { createOrdersListPrefetchQuery } from "@/hooks/use-orders"

type AccountContextType = {
  customer: StoreCustomer | null
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

export const useAccountContext = () => {
  const context = useContext(AccountContext)
  if (!context) {
    throw new Error("useAccountContext must be used within AccountProvider")
  }
  return context
}

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const { customer } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!customer) {
      return
    }

    queryClient.prefetchQuery(
      createOrdersListPrefetchQuery({
        limit: 20,
        offset: 0,
      })
    )
  }, [customer, queryClient])

  const contextValue = {
    customer,
  }

  return <AccountContext value={contextValue}>{children}</AccountContext>
}
