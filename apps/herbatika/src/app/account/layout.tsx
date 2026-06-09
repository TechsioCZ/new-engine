import type { ReactNode } from "react";
import { AccountShell } from "@/components/account-shell";

type AccountLayoutProps = {
  children: ReactNode;
};

export default function AccountLayout({ children }: AccountLayoutProps) {
  return <AccountShell>{children}</AccountShell>;
}
