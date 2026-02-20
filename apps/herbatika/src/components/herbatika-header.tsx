"use client";

import type { HttpTypes } from "@medusajs/types";
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
import { useCart } from "@/lib/storefront/cart";
import {
  CART_ID_CHANGED_EVENT,
  getStoredCartId,
} from "@/lib/storefront/cart-storage";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";
import { HerbatikaLogo } from "./herbatika-logo";

const PRIMARY_NAV_ITEMS = [
  { href: "/c/trapi-ma", label: "Trápi ma" },
  { href: "/c/prirodna-kozmetika", label: "Prírodná kozmetika" },
  { href: "/c/doplnky-vyzivy", label: "Doplnky výživy" },
  { href: "/c/potraviny-a-napoje", label: "Potraviny a nápoje" },
  { href: "/c/eko-domacnost", label: "EKO domácnosť" },
  { href: "/c/ucinne-zlozky-od-a-po-z", label: "Účinné zložky od A po Z" },
  { href: "/c/novinky", label: "Novinky" },
];

const REGION_TO_CURRENCY: Record<string, "EUR" | "CZK"> = {
  at: "EUR",
  cz: "CZK",
  sk: "EUR",
};

const resolveCartTotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
) => {
  if (!cart) {
    return 0;
  }

  if (typeof cart.total === "number") {
    return cart.total;
  }

  if (typeof cart.subtotal === "number") {
    return cart.subtotal;
  }

  return (
    cart.items?.reduce((total, item) => {
      if (typeof item.total === "number") {
        return total + item.total;
      }

      if (typeof item.subtotal === "number") {
        return total + item.subtotal;
      }

      const unitPrice =
        typeof item.unit_price === "number" ? item.unit_price : 0;
      const quantity = typeof item.quantity === "number" ? item.quantity : 1;
      return total + unitPrice * quantity;
    }, 0) ?? 0
  );
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

  const { cart, itemCount } = useCart({
    cartId: cartId ?? undefined,
    autoCreate: true,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });

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
    const queryValue = formData.get("q");
    const query = typeof queryValue === "string" ? queryValue.trim() : "";

    if (!query) {
      router.push("/search");
      return;
    }

    router.push(`/search?q=${encodeURIComponent(query)}`);
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

          <LinkButton
            aria-label="Účet"
            as={NextLink}
            className="px-0 py-0 text-3xl text-fg-secondary hover:text-primary"
            href="/account"
            icon="token-icon-user"
            size="current"
            theme="unstyled"
            variant="secondary"
          />

          <div className="relative">
            <LinkButton
              as={NextLink}
              className="px-450 py-300 text-xl font-bold"
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
            <Header.ActionItem>
              <LinkButton
                as={NextLink}
                className="px-500 py-250 text-xl font-bold"
                href="/c/darceky"
                icon="icon-[mdi--gift-outline]"
                size="sm"
                variant="secondary"
              >
                Darčeky
              </LinkButton>
            </Header.ActionItem>
            <Header.ActionItem>
              <LinkButton
                as={NextLink}
                className="px-500 py-250 text-xl font-bold"
                href="/c/vypredaj-zlavy-a-akcie"
                icon="icon-[mdi--fire]"
                size="sm"
                variant="secondary"
              >
                Akcie
              </LinkButton>
            </Header.ActionItem>
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
          <LinkButton
            as={NextLink}
            block
            className="justify-center font-bold"
            href="/c/darceky"
            icon="icon-[mdi--gift-outline]"
            size="sm"
            variant="secondary"
          >
            Darčeky
          </LinkButton>
          <LinkButton
            as={NextLink}
            block
            className="justify-center font-bold"
            href="/c/vypredaj-zlavy-a-akcie"
            icon="icon-[mdi--fire]"
            size="sm"
            variant="secondary"
          >
            Akcie
          </LinkButton>
        </div>
      </Header.Mobile>
    </Header>
  );
}
