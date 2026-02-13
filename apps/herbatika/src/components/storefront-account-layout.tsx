"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAuth, useLogout } from "@/lib/storefront/auth";
import { cartStorage } from "@/lib/storefront/cart-storage";

const ACCOUNT_NAV_ITEMS = [
  { href: "/account", label: "Prehľad" },
  { href: "/account/orders", label: "Objednávky" },
] as const;

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred.";
};

const isNavItemActive = (pathname: string, href: string) => {
  if (pathname === href) {
    return true;
  }

  if (href === "/account") {
    return false;
  }

  return pathname.startsWith(`${href}/`);
};

type StorefrontAccountLayoutProps = {
  children: ReactNode;
};

export function StorefrontAccountLayout({
  children,
}: StorefrontAccountLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const authQuery = useAuth();
  const logoutMutation = useLogout();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const redirectTarget = pathname;

  useEffect(() => {
    if (isLoggingOut) {
      return;
    }

    if (authQuery.isLoading || authQuery.isAuthenticated) {
      return;
    }

    router.replace(`/auth/login?next=${encodeURIComponent(redirectTarget)}`);
  }, [
    authQuery.isAuthenticated,
    authQuery.isLoading,
    isLoggingOut,
    redirectTarget,
    router,
  ]);

  const handleLogout = async () => {
    setLogoutError(null);
    setIsLoggingOut(true);

    try {
      await logoutMutation.mutateAsync();
      cartStorage.clearCartId();
      router.replace("/");
    } catch (error) {
      setIsLoggingOut(false);
      setLogoutError(resolveErrorMessage(error));
    }
  };

  if (authQuery.isLoading) {
    return (
      <main className="mx-auto w-full max-w-6xl p-6">
        <section className="rounded-xl border border-black/10 bg-white p-6">
          <Skeleton>
            <Skeleton.Text noOfLines={4} />
          </Skeleton>
        </section>
      </main>
    );
  }

  if (!authQuery.isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-6xl p-6">
        <section className="space-y-3 rounded-xl border border-black/10 bg-white p-6">
          <h1 className="text-lg font-semibold">Presmerovanie na prihlásenie</h1>
          <p className="text-sm text-fg-secondary">
            Účet je dostupný iba pre prihlásených používateľov.
          </p>
          <LinkButton
            as={NextLink}
            href={`/auth/login?next=${encodeURIComponent(redirectTarget)}`}
            variant="secondary"
          >
            Prihlásiť sa
          </LinkButton>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-xl border border-black/10 bg-white p-4">
          <header className="space-y-2">
            <h1 className="text-xl font-semibold">Môj účet</h1>
            <Badge variant="info">{authQuery.customer?.email ?? "-"}</Badge>
          </header>

          <nav className="flex flex-col gap-2">
            {ACCOUNT_NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);

              return (
                <LinkButton
                  as={NextLink}
                  block
                  className="justify-start"
                  href={item.href}
                  key={item.href}
                  theme={isActive ? "solid" : "outlined"}
                  variant={isActive ? "primary" : "secondary"}
                >
                  {item.label}
                </LinkButton>
              );
            })}
          </nav>

          {logoutError && <ErrorText showIcon>{logoutError}</ErrorText>}

          <Button
            block
            isLoading={logoutMutation.isPending}
            onClick={() => {
              void handleLogout();
            }}
            variant="danger"
          >
            Odhlásiť
          </Button>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
