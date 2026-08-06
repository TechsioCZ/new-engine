import type { ReactNode } from "react"

import { AccountShell } from "@/components/account-shell"

interface AccountLayoutProps {
  children: ReactNode
}

const AccountLayout = ({ children }: AccountLayoutProps) => (
  <AccountShell>{children}</AccountShell>
)

export default AccountLayout
