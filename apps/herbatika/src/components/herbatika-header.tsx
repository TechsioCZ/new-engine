"use client";

import type { FocusEvent } from "react";
import { useState } from "react";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { SearchForm } from "@techsio/ui-kit/molecules/search-form";
import { Header } from "@techsio/ui-kit/organisms/header";
import NextImage from "next/image";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { cartReadQueryOptions, useCart } from "@/lib/storefront/cart";
import { resolveCartTotalAmount } from "@/lib/storefront/cart-calculations";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { HerbatikaAccountPopover } from "./header/herbatika-account-popover";
import { HerbatikaCartPopover } from "./header/herbatika-cart-popover";
import { HerbatikaDesktopSubmenu } from "./header/herbatika-desktop-submenu";
import {
  HEADER_ACTION_ITEMS,
  PRIMARY_NAV_ITEMS,
} from "./header/herbatika-header.navigation";
import { HerbatikaMobileMenuDialog } from "./header/herbatika-mobile-menu-dialog";
import { HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS } from "./header/herbatika-header.submenu-data";
import { HerbatikaLogo } from "./herbatika-logo";
import { resolveSearchHref } from "./search/search-query-config";

const REGION_TO_CURRENCY: Record<string, "EUR" | "CZK"> = {
  at: "EUR",
  cz: "CZK",
  sk: "EUR",
};

const SUBMENU_ROOT_HANDLES = new Set<string>(
  HERBATIKA_HEADER_SUBMENU_ROOT_CONFIGS.map((group) => group.rootHandle),
);

const resolveRootHandleFromHref = (href: string) => {
  if (!href.startsWith("/c/")) {
    return null;
  }

  return href.slice(3);
};

export function HerbatikaHeader() {
  const router = useRouter();
  const region = useRegionContext();
  const [activeRootHandle, setActiveRootHandle] = useState<string | null>(null);

  const { cart, itemCount } = useCart(
    {
      autoCreate: true,
      region_id: region?.region_id,
      country_code: region?.country_code,
      enabled: Boolean(region?.region_id),
    },
    {
      queryOptions: cartReadQueryOptions,
    },
  );

  const currency = REGION_TO_CURRENCY[region?.country_code ?? ""] ?? "EUR";
  const cartTotalLabel = formatCurrencyAmount(
    resolveCartTotalAmount(cart),
    currency,
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    router.push(resolveSearchHref(formData.get("q")));
  };

  const handleActivateDesktopItem = (href: string) => {
    const rootHandle = resolveRootHandleFromHref(href);
    if (!rootHandle || !SUBMENU_ROOT_HANDLES.has(rootHandle)) {
      setActiveRootHandle(null);
      return;
    }

    setActiveRootHandle(rootHandle);
  };

  const handleDesktopBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget;
    if (
      nextFocusedElement instanceof Node &&
      event.currentTarget.contains(nextFocusedElement)
    ) {
      return;
    }

    setActiveRootHandle(null);
  };

  return (
    <Header direction="vertical" className="sticky top-0 z-50 flex header-desktop:relative">
      <Header.Container className="mx-auto flex max-w-max-w w-full min-w-0 items-center justify-between gap-200 px-header-lg py-header-container-y 2xl:px-header-2xl">
        <HerbatikaLogo className="min-w-0 shrink" size="lg" />

        <div className="hidden w-full max-w-header-search flex-1 @header-desktop:block">
          <SearchForm className="w-full" onSubmit={handleSearchSubmit}>
            <SearchForm.Control>
              <SearchForm.Input
                name="q"
                placeholder="Napíšte, čo hľadáte..."
              />
              <SearchForm.Button
                aria-label="Hľadať"
                className="rounded-none"
                showSearchIcon
                iconSize="xl"
              />
            </SearchForm.Control>
          </SearchForm>
        </div>

        <Header.Actions className="gap-450 @max-header-desktop:hidden">
          <NextLink
            className="inline-flex items-center gap-300 text-fg-secondary font-open-sans hover:text-fg-primary"
            href="tel:+421232112345"
          >
            <Icon icon="token-icon-phone-talk" size="2xl" />
            <span className="leading-snug">
              <span className="block text-md font-semibold leading-snug text-fg-primary">
                +421 2/321 123 45
              </span>
              <span className="block text-xs ml-0.5 font-normal leading-snug text-fg-secondary">
                (Po-Pia: 09:00 - 16:00)
              </span>
            </span>
          </NextLink>

          <Button
            aria-label="Obľúbené"
            className="text-3xl text-fg-secondary hover:text-primary"
            icon="token-icon-heart"
            size="current"
            theme="unstyled"
            type="button"
            iconSize="2xl"
          />

          <HerbatikaAccountPopover />
          <HerbatikaCartPopover
            cart={cart}
            cartTotalLabel={cartTotalLabel}
            currencyCode={currency}
            itemCount={itemCount}
          />
        </Header.Actions>

        <div className="flex shrink-0 items-center gap-150 @header-desktop:hidden">
          <div className="relative">
            <LinkButton
              as={NextLink}
              className="px-350 py-250 text-md md:text-xl font-bold"
              href="/checkout/kosik"
              icon="token-icon-cart"
              size="sm"
              variant="primary"
            >
              {cartTotalLabel}
            </LinkButton>
            <Badge
              className="absolute -top-150 -right-150 min-h-400 min-w-400 justify-center rounded-full px-100 py-0 text-xs leading-none"
              variant="secondary"
            >
              {String(itemCount)}
            </Badge>
          </div>

          <Header.Hamburger className="h-750 w-750 shrink-0 border border-border-secondary text-2xl" />
        </div>
      </Header.Container>

      <Header.Desktop className="bg-primary">
        <div
          className="relative flex w-full min-h-header-nav"
          onBlurCapture={handleDesktopBlur}
          onMouseLeave={() => setActiveRootHandle(null)}
        >
          <Header.Container className="mx-auto flex min-h-header-nav max-w-max-w items-center justify-between px-header-lg 2xl:px-header-2xl">
            <Header.Nav
              className="flex-nowrap md:h-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              size="sm"
            >
              {PRIMARY_NAV_ITEMS.map((item) => {
                const rootHandle = resolveRootHandleFromHref(item.href);
                const hasSubmenu = Boolean(
                  rootHandle && SUBMENU_ROOT_HANDLES.has(rootHandle),
                );

                return (
                  <NextLink
                  key={item.href}
                  aria-expanded={
                      hasSubmenu ? activeRootHandle === rootHandle : undefined
                    }
                  aria-haspopup={hasSubmenu ? "dialog" : undefined}
                  href={item.href}
                  onFocus={() => handleActivateDesktopItem(item.href)}
                  className="shrink-0 h-full"
                  >
                  <Header.NavItem
                    className="whitespace-nowrap lg:max-header-tablet:p-header-item-desktop-lg lg:max-header-tablet:text-header-item-desktop-lg leading-none h-full items-center flex"
                    onMouseEnter={() => handleActivateDesktopItem(item.href)}
                  >
                    {item.label}
                  </Header.NavItem>
                  </NextLink>
                );
              })}
            </Header.Nav>

            <Header.Actions className="gap-x-250" size="sm">
              {HEADER_ACTION_ITEMS.map((action) => (
                <LinkButton
                  key={action.href}
                  as={NextLink}
                  className="px-300 py-400 rounded-xs h-fit text-sm leading-none font-bold bg-surface hover:bg-highlight text-fg-primary"
                  href={action.href}
                  size="sm"
                  variant="secondary"
                >
                  <NextImage
                    src={action.src}
                    alt={action.label}
                    width={24}
                    height={24}
                  />
                  {action.label}
                </LinkButton>
              ))}
            </Header.Actions>
          </Header.Container>

          <HerbatikaDesktopSubmenu
            activeRootHandle={activeRootHandle}
            onClose={() => setActiveRootHandle(null)}
          />
        </div>
      </Header.Desktop>

      <Header.Mobile
        className="inset-x-0 z-20 w-full max-w-full overflow-x-hidden"
        position="right"
      >
        <HerbatikaMobileMenuDialog onSearchSubmit={handleSearchSubmit} />
      </Header.Mobile>
    </Header>
  );
}
