import type { ReactNode } from "react"

import { AccountShell } from "@/components/account-shell"

interface AccountLayoutProps {
  children: ReactNode
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  return <AccountShell>{children}</AccountShell>
}
