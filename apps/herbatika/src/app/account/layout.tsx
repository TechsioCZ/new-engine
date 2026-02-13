import type { ReactNode } from "react";
import { StorefrontAccountLayout } from "@/components/storefront-account-layout";

type AccountLayoutProps = {
  children: ReactNode;
};

export default function AccountLayout({ children }: AccountLayoutProps) {
  return <StorefrontAccountLayout>{children}</StorefrontAccountLayout>;
}
