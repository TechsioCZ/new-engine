"use client"

import type { StoreCustomer } from "@medusajs/types"
import { useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useEffect } from "react"
import type { ReactNode } from "react"

import { useAuth } from "@/hooks/use-auth"
import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import { getOrders } from "@/services/order-service"

interface AccountContextType {
  customer: StoreCustomer | null
}

const AccountContext = createContext<
  AccountContextType["customer"] | undefined
>(undefined)

export const useAccountContext = () => {
  const customer = useContext(AccountContext)
  if (customer === undefined) {
    throw new Error("useAccountContext must be used within AccountProvider")
  }
  return { customer }
}

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const { customer } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!customer) {
      return
    }
    void queryClient.prefetchQuery({
      queryFn: async () => await getOrders({ limit: 20, offset: 0 }),
      queryKey: queryKeys.orders.list({ limit: 20, offset: 0 }),
      ...cacheConfig.userData,
    })
  }, [customer, queryClient])

  return <AccountContext value={customer}>{children}</AccountContext>
}
