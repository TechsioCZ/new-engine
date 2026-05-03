"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AccountLayoutSkeleton } from "@/components/loading/account-layout-skeleton";
import { AccountOrdersSkeleton } from "@/components/loading/account-orders-skeleton";
import { OrderSkeleton } from "@/components/loading/order-skeleton";
import { useAuth } from "@/lib/storefront/auth";
import { useLogoutAction } from "@/lib/storefront/use-logout-action";
import { Icon, IconType } from "@techsio/ui-kit/atoms/icon";

type AccountNavItemType = {
  href: string;
  label: string;
  icon: IconType;
}

const ACCOUNT_NAV_ITEMS: AccountNavItemType[] = [
  { href: "/account", label: "Prehľad", icon:"token-icon-user"},
  { href: "/account/orders", label: "Objednávky", icon:"token-icon-order"},
  { href: "/account/settings", label: "Nastavenia", icon:"token-icon-settings"},
] as const;

const isNavItemActive = (pathname: string, href: string) => {
  if (pathname === href) {
    return true;
  }

  if (href === "/account") {
    return false;
  }

  return pathname.startsWith(`${href}/`);
};

type AccountShellProps = {
  children: ReactNode;
};

export function AccountShell({
  children,
}: AccountShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const authQuery = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const redirectTarget = pathname;
  const isOrdersListRoute = pathname === "/account/orders";
  const isOrderDetailRoute = pathname.startsWith("/account/orders/");
  const {
    clearLogoutError,
    handleLogout: performLogout,
    logoutError,
    logoutMutation,
  } = useLogoutAction({
    onSuccess: () => {
      router.replace("/");
    },
  });

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
    clearLogoutError();
    setIsLoggingOut(true);

    const result = await performLogout();
    if (!result.ok) {
      setIsLoggingOut(false);
    }
  };

  if (authQuery.isLoading) {
    return (
      <AccountLayoutSkeleton
        surface={
          isOrderDetailRoute
            ? <OrderSkeleton />
            : isOrdersListRoute
              ? <AccountOrdersSkeleton />
              : undefined
        }
        surfaceLines={4}
      />
    );
  }

  if (!authQuery.isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-max-w p-account-page 2xl:p-account-page-lg">
        <section className="space-y-300 rounded-lg border border-border-secondary bg-surface p-550">
          <h1 className="text-lg font-semibold">Presmerovanie na prihlásenie</h1>
          <p className="text-sm text-fg-secondary">
            Účet je dostupný iba pre prihlásených používateľov.
          </p>
          <LinkButton
            as={NextLink}
            href={`/auth/login?next=${encodeURIComponent(redirectTarget)}`}
            variant="secondary"
            size="sm"
          >
            Prihlásiť sa
          </LinkButton>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-max-w p-account-page 2xl:p-account-page-lg">
      <div className="grid gap-account-page-gap lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-400 rounded-lg border border-border-secondary bg-surface p-400">
          <header className="leading-none">
            <h1 className="text-xl font-semibold">{authQuery.customer?.first_name} {authQuery.customer?.last_name}</h1>
            <span className="text-fg-secondary text-sm">{authQuery.customer?.email ?? "-"}</span>
          </header>

          <nav className="flex flex-col gap-200">
            {ACCOUNT_NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);

              return (
                <LinkButton
                  className="justify-start text-lg px-200 data-[active=true]:text-primary hover:text-primary"
                  as={NextLink}
                  block
                  href={item.href}
                  key={item.href}
                  theme="unstyled"
                  size="current"
                  
                  data-active={isActive}
                >
                  <Icon icon={item.icon} size="2xl" />
                  <span>{item.label}</span>
                </LinkButton>
              );
            })}
          </nav>

          {logoutError && (
            <StatusText showIcon status="error">
              {logoutError}
            </StatusText>
          )}

          <hr className="border-border-primary"/>

          <Button
            block
            onClick={() => handleLogout()}
            isLoading={logoutMutation.isPending}
            theme="unstyled"
            size="current"
            className="justify-start text-lg hover:text-danger px-200"
            icon={"token-icon-logout"}
            iconSize="2xl"
          >
            <span>Odhlásiť</span>
          </Button>
        </aside>

        <section className="min-w-0 w-full max-w-account-content">{children}</section>
      </div>
    </main>
  );
}
