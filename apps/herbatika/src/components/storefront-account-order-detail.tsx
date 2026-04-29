"use client";

import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import NextLink from "next/link";
import { StorefrontAccountOrderDetailItems } from "@/components/account/orders/storefront-account-order-detail-items";
import { StorefrontAccountOrderDetailSummary } from "@/components/account/orders/storefront-account-order-detail-summary";
import { HerbatikaBreadcrumb } from "@/components/herbatika-breadcrumb";
import { OrderSkeleton } from "@/components/loading/order-skeleton";
import {
  StorefrontAccountSurface,
} from "@/components/account/storefront-account-surface";
import { resolveOrderDisplayId } from "@/lib/storefront/order-format";
import { useAuth } from "@/lib/storefront/auth";
import { useOrder } from "@/lib/storefront/orders";

type StorefrontAccountOrderDetailProps = {
  orderId: string;
};

export function StorefrontAccountOrderDetail({
  orderId,
}: StorefrontAccountOrderDetailProps) {
  const authQuery = useAuth();
  const orderQuery = useOrder({
    id: orderId,
    enabled: authQuery.isAuthenticated,
  });

  if (authQuery.isLoading || orderQuery.isLoading) {
    return <OrderSkeleton />;
  }

  if (orderQuery.error) {
    return (
      <StorefrontAccountSurface className="space-y-400">
        <StatusText showIcon status="error">
          {orderQuery.error}
        </StatusText>
        <LinkButton as={NextLink} href="/account/orders" variant="secondary" size="sm">
          Späť na objednávky
        </LinkButton>
      </StorefrontAccountSurface>
    );
  }

  if (!orderQuery.order) {
    return (
      <StorefrontAccountSurface className="space-y-400">
        <h2 className="text-lg font-semibold">Objednávka nebola nájdená</h2>
        <p className="text-sm text-fg-secondary">
          Skontrolujte URL alebo sa vráťte do zoznamu objednávok.
        </p>
        <LinkButton as={NextLink} href="/account/orders" variant="secondary" size="sm">
          Späť na objednávky
        </LinkButton>
      </StorefrontAccountSurface>
    );
  }

  const order = orderQuery.order;

  return (
    <div className="space-y-400">
      <HerbatikaBreadcrumb
        items={[
          { label: "Domov", href: "/" },
          { label: "Účet", href: "/account" },
          { label: "Objednávky", href: "/account/orders" },
          { label: resolveOrderDisplayId(order) },
        ]}
      />

      <StorefrontAccountOrderDetailSummary
        customerEmail={authQuery.customer?.email}
        order={order}
      />

      <StorefrontAccountOrderDetailItems order={order} />

    </div>
  );
}
