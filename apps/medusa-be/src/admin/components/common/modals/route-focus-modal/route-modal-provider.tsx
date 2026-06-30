import { type PropsWithChildren, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RouteModalProviderContext } from "./route-modal-context"

type RouteModalProviderProps = PropsWithChildren<{
  prev: string
}>

export const RouteModalProvider = ({
  prev,
  children,
}: RouteModalProviderProps) => {
  const navigate = useNavigate()

  const [closeOnEscape, setCloseOnEscape] = useState(true)

  const handleSuccess = (path?: string) => {
    const to = path || prev
    navigate(to, { replace: true, state: { isSubmitSuccessful: true } })
  }

  const value = {
    handleSuccess,
    setCloseOnEscape,
    __internal: { closeOnEscape },
  }

  return (
    <RouteModalProviderContext.Provider value={value}>
      {children}
    </RouteModalProviderContext.Provider>
  )
}
