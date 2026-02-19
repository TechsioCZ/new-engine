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
        <main className="mx-auto w-full max-w-account-content px-400 py-550 lg:px-550">
          <div className="h-950 animate-pulse rounded-xl border border-border-secondary bg-surface" />
        </main>
      }
    >
      <StorefrontAccountLayout>{children}</StorefrontAccountLayout>
    </Suspense>
  );
}
