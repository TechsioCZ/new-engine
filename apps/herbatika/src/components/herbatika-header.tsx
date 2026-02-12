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
import { useEffect, useState } from "react";
import { useCart } from "@/lib/storefront/cart";
import {
  CART_ID_CHANGED_EVENT,
  getStoredCartId,
} from "@/lib/storefront/cart-storage";
import { HerbatikaLogo } from "./herbatika-logo";

const PRIMARY_NAV_ITEMS = [
  { href: "/#trapi-ma", label: "Trápi ma" },
  { href: "/#prirodna-kozmetika", label: "Prírodná kozmetika" },
  { href: "/#doplnky-vyzivy", label: "Doplnky výživy" },
  { href: "/#potraviny-a-napoje", label: "Potraviny a nápoje" },
  { href: "/#eko-domacnost", label: "EKO domácnosť" },
  { href: "/#ucinne-zlozky", label: "Účinné zložky od A po Z" },
  { href: "/#novinky", label: "Novinky" },
];

const REGION_TO_CURRENCY: Record<string, "EUR" | "CZK"> = {
  at: "EUR",
  cz: "CZK",
  sk: "EUR",
};

const resolveMinorTotal = (cart: HttpTypes.StoreCart | null | undefined) => {
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

      const unitPrice = typeof item.unit_price === "number" ? item.unit_price : 0;
      const quantity = typeof item.quantity === "number" ? item.quantity : 1;
      return total + unitPrice * quantity;
    }, 0) ?? 0
  );
};

const formatPrice = (minor: number, currency: "EUR" | "CZK") => {
  const locale = currency === "CZK" ? "cs-CZ" : "sk-SK";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
};

export function HerbatikaHeader() {
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
  const cartTotalLabel = formatPrice(resolveMinorTotal(cart), currency);

  return (
    <Header
      className="relative z-50 border-b border-border-secondary bg-surface"
      direction="vertical"
    >
      <Header.Container className="mx-auto flex w-full max-w-[1418px] items-center gap-3 px-4 py-5 lg:px-6">
        <HerbatikaLogo className="shrink-0" />

        <SearchForm className="mx-auto hidden w-full max-w-[490px] md:grid">
          <SearchForm.Control className="rounded-[12px] border-border-secondary bg-surface">
            <SearchForm.Input
              className="h-12 text-lg"
              name="q"
              placeholder="Napíšte, čo hľadáte..."
            />
            <SearchForm.Button
              aria-label="Hľadať"
              className="min-w-14 rounded-r-[12px] px-4"
              showSearchIcon
            />
          </SearchForm.Control>
        </SearchForm>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            as={NextLink}
            className="inline-flex items-center gap-2 text-fg-secondary hover:text-fg-primary"
            href="tel:+421232112345"
          >
            <Icon className="text-3xl" icon="icon-[mdi--phone-outline]" />
            <span className="leading-tight">
              <span className="block text-lg font-semibold text-fg-primary">
                +421 2/321 123 45
              </span>
              <span className="block text-sm text-fg-tertiary">
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
              className="rounded-[10px] px-4 py-2 text-xl font-bold"
              href="/checkout"
              icon="token-icon-cart"
              size="sm"
              variant="primary"
            >
              {cartTotalLabel}
            </LinkButton>
            <Badge
              className="absolute -top-2 -right-2 min-w-5 justify-center rounded-full px-1 py-0.5 text-xs"
              variant="secondary"
            >
              {String(itemCount)}
            </Badge>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <div className="relative">
            <LinkButton
              as={NextLink}
              className="rounded-[10px] px-3 py-2 text-sm font-bold"
              href="/checkout"
              icon="token-icon-cart"
              size="sm"
              variant="primary"
            >
              {cartTotalLabel}
            </LinkButton>
            <Badge
              className="absolute -top-2 -right-2 min-w-5 justify-center rounded-full px-1 py-0.5 text-xs"
              variant="secondary"
            >
              {String(itemCount)}
            </Badge>
          </div>

          <Header.Hamburger className="rounded-[10px] border border-border-secondary p-2 text-2xl text-fg-primary" />
        </div>
      </Header.Container>

      <Header.Desktop className="w-full bg-primary">
        <Header.Container className="mx-auto flex w-full max-w-[1418px] items-center justify-between px-4 lg:px-6">
          <Header.Nav className="flex-nowrap gap-0">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <Header.NavItem
                className="px-3 py-3 text-sm font-bold text-fg-reverse hover:bg-white/12"
                key={item.href}
              >
                <Link as={NextLink} className="whitespace-nowrap" href={item.href}>
                  {item.label}
                </Link>
              </Header.NavItem>
            ))}
          </Header.Nav>

          <Header.Actions className="gap-2 py-2">
            <Header.ActionItem>
              <LinkButton
                as={NextLink}
                className="rounded-[10px] px-4 py-2 text-2xl font-bold"
                href="/#darceky"
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
                className="rounded-[10px] px-4 py-2 text-2xl font-bold"
                href="/#akcie"
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
        className="z-40 w-full border-t border-border-secondary bg-surface shadow-md"
        position="left"
      >
        <div className="border-border-secondary border-b p-4">
          <SearchForm className="w-full">
            <SearchForm.Control className="rounded-[12px] border-border-secondary bg-surface">
              <SearchForm.Input name="q" placeholder="Napíšte, čo hľadáte..." />
              <SearchForm.Button aria-label="Hľadať" showSearchIcon />
            </SearchForm.Control>
          </SearchForm>
        </div>

        <Header.Nav className="w-full gap-0">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <Header.NavItem
              className="w-full border-border-secondary border-b px-4 py-3 text-sm font-bold text-fg-primary"
              key={`mobile-${item.href}`}
            >
              <Link as={NextLink} className="w-full" href={item.href}>
                {item.label}
              </Link>
            </Header.NavItem>
          ))}
        </Header.Nav>

        <div className="flex gap-2 p-4">
          <LinkButton
            as={NextLink}
            block
            className="justify-center rounded-[10px] font-bold"
            href="/#darceky"
            icon="icon-[mdi--gift-outline]"
            size="sm"
            variant="secondary"
          >
            Darčeky
          </LinkButton>
          <LinkButton
            as={NextLink}
            block
            className="justify-center rounded-[10px] font-bold"
            href="/#akcie"
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
