"use client";

import { useRegionContext } from "@techsio/storefront-data/shared";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Link } from "@techsio/ui-kit/atoms/link";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { SearchForm } from "@techsio/ui-kit/molecules/search-form";
import { Header } from "@techsio/ui-kit/organisms/header";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { storefrontCartReadQueryOptions, useCart } from "@/lib/storefront/cart";
import { resolveCartTotalAmount } from "@/lib/storefront/cart-calculations";
import {
  CART_ID_CHANGED_EVENT,
  getStoredCartId,
} from "@/lib/storefront/cart-storage";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { HEADER_ACTION_ITEMS, PRIMARY_NAV_ITEMS } from "./header/herbatika-header.navigation";
import { HerbatikaAccountPopover } from "./header/herbatika-account-popover";
import { HerbatikaCartPopover } from "./header/herbatika-cart-popover";
import { HerbatikaLogo } from "./herbatika-logo";
import { resolveSearchHref } from "./search/search-query-config";

const REGION_TO_CURRENCY: Record<string, "EUR" | "CZK"> = {
  at: "EUR",
  cz: "CZK",
  sk: "EUR",
};

export function HerbatikaHeader() {
  const router = useRouter();
  const region = useRegionContext();
  const [cartId, setCartId] = useState<string | null>(() => getStoredCartId());

  useEffect(() => {
    const handleCartIdChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ cartId: string | null }>).detail;
      setCartId(detail?.cartId ?? null);
    };

    window.addEventListener(CART_ID_CHANGED_EVENT, handleCartIdChanged);

    return () => {
      window.removeEventListener(CART_ID_CHANGED_EVENT, handleCartIdChanged);
    };
  }, []);

  const { cart, itemCount } = useCart(
    {
      cartId: cartId ?? undefined,
      autoCreate: true,
      region_id: region?.region_id,
      country_code: region?.country_code,
      enabled: Boolean(region?.region_id),
    },
    {
      queryOptions: storefrontCartReadQueryOptions,
    },
  );

  useEffect(() => {
    if (!cart?.id) {
      return;
    }

    setCartId((currentCartId) => {
      if (currentCartId === cart.id) {
        return currentCartId;
      }

      return cart.id;
    });
  }, [cart?.id]);

  const currency = REGION_TO_CURRENCY[region?.country_code ?? ""] ?? "EUR";
  const cartTotalLabel = formatCurrencyAmount(
    resolveCartTotalAmount(cart),
    currency,
  );

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    router.push(resolveSearchHref(formData.get("q")));
  };

  return (
    <Header
      className="relative z-50 w-full border-b border-border-secondary bg-header-bg"
      direction="vertical"
    >
      <Header.Container className="mx-auto flex w-full max-w-max-w items-center gap-600 px-400 py-300 @header-desktop:px-600">
        <HerbatikaLogo className="shrink-0" size="lg" />

        <div className="hidden w-full max-w-header-search flex-1 @header-desktop:block">
          <SearchForm className="w-full" onSubmit={handleSearchSubmit}>
            <SearchForm.Control className="h-750 rounded-search-form border-border-secondary bg-surface">
              <SearchForm.Input
                className="h-full px-500 text-md text-fg-secondary placeholder:text-fg-placeholder"
                name="q"
                placeholder="Napíšte, čo hľadáte..."
              />
              <SearchForm.Button
                aria-label="Hľadať"
                className="min-w-800 rounded-r-search-form rounded-l-none px-450"
                showSearchIcon
              />
            </SearchForm.Control>
          </SearchForm>
        </div>

        <div className="flex items-center gap-450 @max-header-desktop:hidden">
          <Link
            as={NextLink}
            className="inline-flex items-center gap-300 text-fg-secondary hover:text-fg-primary"
            href="tel:+421232112345"
          >
            <Icon className="text-2xl" icon="icon-[mdi--phone-outline]" />
            <span className="leading-snug">
              <span className="block text-md font-semibold leading-snug text-fg-primary">
                +421 2/321 123 45
              </span>
              <span className="block text-xs font-normal leading-snug text-fg-secondary">
                (Po-Pia: 09:00 - 16:00)
              </span>
            </span>
          </Link>

          <Button
            aria-label="Obľúbené"
            className="text-3xl text-fg-secondary hover:text-primary"
            icon="token-icon-heart"
            size="current"
            theme="unstyled"
            type="button"
          />

          <HerbatikaAccountPopover />
          <HerbatikaCartPopover
            cart={cart}
            cartTotalLabel={cartTotalLabel}
            currencyCode={currency}
            itemCount={itemCount}
          />
        </div>

        <div className="ml-auto flex items-center gap-250 @header-desktop:hidden">
          <div className="relative">
            <LinkButton
              as={NextLink}
              className="px-350 py-250 text-xl font-bold"
              href="/checkout"
              icon="token-icon-cart"
              size="sm"
              variant="primary"
            >
              {cartTotalLabel}
            </LinkButton>
            <Badge
              className="absolute -top-200 -right-200 min-w-500 justify-center rounded-full px-100 py-50 text-xs"
              variant="secondary"
            >
              {String(itemCount)}
            </Badge>
          </div>

          <Header.Hamburger className="border border-border-secondary text-2xl text-fg-primary" />
        </div>
      </Header.Container>

      <Header.Desktop className="w-full bg-primary">
        <Header.Container className="mx-auto flex min-h-750 w-full max-w-max-w items-center justify-between gap-300 px-300 @header-desktop:px-600">
          <Header.Nav className="flex-nowrap gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <Header.NavItem className="shrink-0 py-300" key={item.href}>
                <Link
                  as={NextLink}
                  className="whitespace-nowrap leading-none"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </Header.NavItem>
            ))}
          </Header.Nav>

          <Header.Actions className="gap-300 pl-300">
            {HEADER_ACTION_ITEMS.map((action) => (
              <Header.ActionItem key={action.href}>
                <LinkButton
                  as={NextLink}
                  className="px-500 py-250 text-xl font-bold"
                  href={action.href}
                  icon={action.icon}
                  size="sm"
                  variant="secondary"
                >
                  {action.label}
                </LinkButton>
              </Header.ActionItem>
            ))}
          </Header.Actions>
        </Header.Container>
      </Header.Desktop>

      <Header.Mobile
        className="w-full border-t border-border-secondary bg-surface"
        position="left"
      >
        <div className="border-border-secondary border-b p-400">
          <SearchForm className="w-full" onSubmit={handleSearchSubmit}>
            <SearchForm.Control className="h-750 rounded-search-form border-border-secondary bg-surface">
              <SearchForm.Input
                className="h-full px-500 text-md text-fg-secondary placeholder:text-fg-placeholder"
                name="q"
                placeholder="Napíšte, čo hľadáte..."
              />
              <SearchForm.Button aria-label="Hľadať" showSearchIcon />
            </SearchForm.Control>
          </SearchForm>
        </div>

        <Header.Nav className="w-full gap-0">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <Header.NavItem
              className="w-full border-border-secondary border-b"
              key={`mobile-${item.href}`}
            >
              <Link as={NextLink} className="w-full" href={item.href}>
                {item.label}
              </Link>
            </Header.NavItem>
          ))}
        </Header.Nav>

        <div className="flex gap-300 p-400">
          {HEADER_ACTION_ITEMS.map((action) => (
            <LinkButton
              as={NextLink}
              block
              className="justify-center font-bold"
              href={action.href}
              icon={action.icon}
              key={`mobile-action-${action.href}`}
              size="sm"
              variant="secondary"
            >
              {action.label}
            </LinkButton>
          ))}
        </div>
      </Header.Mobile>
    </Header>
  );
}
