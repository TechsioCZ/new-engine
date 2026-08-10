import type { ReactNode } from "react"

interface AuthLayoutProps {
  children: ReactNode
}

const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="flex min-h-screen items-center justify-center bg-auth-layout-bg p-auth-layout-padding px-0">
    <div className="w-full max-w-auth-layout-max-w">{children}</div>
  </div>
)

export default AuthLayout
