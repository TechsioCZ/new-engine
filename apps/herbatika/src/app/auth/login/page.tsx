import { Suspense } from "react";
import { StorefrontAuthPageContent } from "@/components/storefront-auth-page-content";

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-auth-content px-400 py-550 lg:px-550">
      <Suspense
        fallback={
          <section className="rounded-xl border border-border-secondary bg-surface p-550">
            <p className="text-sm text-fg-secondary">Načítavam formulár…</p>
          </section>
        }
      >
        <StorefrontAuthPageContent mode="login" />
      </Suspense>
    </main>
  );
}
