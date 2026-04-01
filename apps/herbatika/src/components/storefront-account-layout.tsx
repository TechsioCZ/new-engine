"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAuth, useLogout } from "@/lib/storefront/auth";
import { cartStorage } from "@/lib/storefront/cart-storage";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
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
      <main className="mx-auto w-full max-w-max-w px-400 py-550 lg:px-550">
        <section className="rounded-lg border border-border-secondary bg-surface p-550">
          <Skeleton>
            <Skeleton.Text noOfLines={4} />
          </Skeleton>
        </section>
      </main>
    );
  }

  if (!authQuery.isAuthenticated) {
    return (
      <main className="mx-auto w-full max-w-max-w px-400 py-550 lg:px-550">
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
    <main className="mx-auto w-full max-w-max-w px-400 py-550 lg:px-550">
      <div className="grid gap-550 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
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
                  <Icon icon={item.icon} className="text-2xl" />
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
            theme="unstyled"
            size="current"
            className="justify-start text-lg hover:text-danger px-200"
          >
            <Icon icon="token-icon-logout" className="text-2xl" />
            <span>Odhlásiť</span>
          </Button>
        </aside>

        <section className="min-w-0 w-full max-w-account-content">{children}</section>
      </div>
    </main>
  );
}


const AccountTabs = ({items}: {items: string[]}) => {

  return(
     <aside className="space-y-400 rounded-lg border border-border-secondary bg-surface p-400">
          <header className="space-y-200">
            <h1 className="text-xl font-semibold">Môj účet</h1>
          </header>
            <nav className="flex flex-col gap-200">
            {ACCOUNT_NAV_ITEMS.map((item) => {

              return (
                <LinkButton
                  as={NextLink}
                  block
                  href={item.href}
                  key={item.href}
                  theme="unstyled"
                  size="current"
                >
                  {item.label}
                </LinkButton>
              );
            })}
          </nav>
      </aside>
  )
}