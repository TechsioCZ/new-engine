"use client";

import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { CheckoutFooter } from "@/components/checkout/checkout-footer";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { HerbatikaFooter } from "@/components/herbatika-footer";
import { HerbatikaHeader } from "@/components/herbatika-header";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isCheckoutRoute = pathname.startsWith("/checkout");

  if (isCheckoutRoute) {
    return (
      <div className="flex min-h-dvh flex-col bg-base">
        <CheckoutHeader />
        <div className="flex-1">{children}</div>
        <CheckoutFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-base">
      <HerbatikaHeader />
      <div className="flex-1">{children}</div>
      <HerbatikaFooter />
    </div>
  );
}
