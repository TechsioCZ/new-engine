import { useState } from "react"
import type { PropsWithChildren } from "react"
import { useNavigate } from "react-router-dom"

import { RouteModalProviderContext } from "./route-modal-context"

type RouteModalProviderProps = PropsWithChildren<{
  prev: string
}>

const useRouteModalProviderValue = (prev: string) => {
  const navigate = useNavigate()
  const [closeOnEscape, setCloseOnEscape] = useState(true)
  const handleSuccess = (path?: string) => {
    const to = path ?? prev
    navigate(to, { replace: true, state: { isSubmitSuccessful: true } })
  }
  return {
    __internal: { closeOnEscape },
    handleSuccess,
    setCloseOnEscape,
  }
}

export const RouteModalProvider = ({
  prev,
  children,
}: RouteModalProviderProps) => {
  const value = useRouteModalProviderValue(prev)

  return (
    <RouteModalProviderContext.Provider value={value}>
      {children}
    </RouteModalProviderContext.Provider>
  )
}
