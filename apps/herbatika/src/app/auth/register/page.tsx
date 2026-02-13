import { Suspense } from "react";
import { StorefrontAuthPageContent } from "@/components/storefront-auth-page-content";

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <Suspense
        fallback={
          <section className="rounded-xl border border-black/10 bg-white p-6">
            <p className="text-sm text-fg-secondary">Načítavam formulár…</p>
          </section>
        }
      >
        <StorefrontAuthPageContent mode="register" />
      </Suspense>
    </main>
  );
}
