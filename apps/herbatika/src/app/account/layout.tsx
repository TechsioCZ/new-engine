import type { ReactNode } from "react";
import { Suspense } from "react";
import { StorefrontAccountLayout } from "@/components/storefront-account-layout";

type AccountLayoutProps = {
  children: ReactNode;
};

export default function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl p-6">
          <div className="h-96 animate-pulse rounded-xl border border-black/10 bg-white" />
        </main>
      }
    >
      <StorefrontAccountLayout>{children}</StorefrontAccountLayout>
    </Suspense>
  );
}
