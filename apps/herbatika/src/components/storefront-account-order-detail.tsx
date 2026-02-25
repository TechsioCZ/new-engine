"use client";

import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import NextLink from "next/link";
import { StorefrontAccountOrderDetailItems } from "@/components/account/orders/storefront-account-order-detail-items";
import { StorefrontAccountOrderDetailSummary } from "@/components/account/orders/storefront-account-order-detail-summary";
import {
  StorefrontAccountSkeletonSurface,
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
    return <StorefrontAccountSkeletonSurface lines={10} />;
  }

  if (orderQuery.error) {
    return (
      <StorefrontAccountSurface className="space-y-400">
        <ErrorText showIcon>{orderQuery.error}</ErrorText>
        <LinkButton as={NextLink} href="/account/orders" variant="secondary">
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
        <LinkButton as={NextLink} href="/account/orders" variant="secondary">
          Späť na objednávky
        </LinkButton>
      </StorefrontAccountSurface>
    );
  }

  const order = orderQuery.order;

  return (
    <div className="space-y-400">
      <Breadcrumb
        items={[
          { label: "Domov", href: "/" },
          { label: "Účet", href: "/account" },
          { label: "Objednávky", href: "/account/orders" },
          { label: resolveOrderDisplayId(order) },
        ]}
        linkAs={NextLink}
      />

      <StorefrontAccountOrderDetailSummary
        customerEmail={authQuery.customer?.email}
        order={order}
      />

      <StorefrontAccountOrderDetailItems order={order} />

      <LinkButton
        as={NextLink}
        href="/account/orders"
        theme="outlined"
        variant="secondary"
      >
        Späť na objednávky
      </LinkButton>
    </div>
  );
}
