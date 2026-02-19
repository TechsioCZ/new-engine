"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import {
  StorefrontAccountSkeletonSurface,
  StorefrontAccountSurface,
} from "@/components/account/storefront-account-surface";
import { useAuth } from "@/lib/storefront/auth";
import { useOrders } from "@/lib/storefront/orders";

export function StorefrontAccountOverview() {
  const authQuery = useAuth();
  const ordersQuery = useOrders({
    page: 1,
    limit: 1,
    enabled: authQuery.isAuthenticated,
  });

  if (authQuery.isLoading) {
    return <StorefrontAccountSkeletonSurface lines={4} />;
  }

  if (!authQuery.customer) {
    return null;
  }

  return (
    <StorefrontAccountSurface className="space-y-500">
      <header className="space-y-200">
        <h2 className="text-xl font-semibold">Prehľad účtu</h2>
        <p className="text-sm text-fg-secondary">
          Správa objednávok a údajov zákazníka.
        </p>
      </header>

      <div className="flex flex-wrap gap-200">
        <Badge variant="success">
          {`${authQuery.customer.first_name ?? ""} ${authQuery.customer.last_name ?? ""}`.trim() ||
            "Zákazník"}
        </Badge>
        <Badge variant="info">{authQuery.customer.email ?? "-"}</Badge>
        <Badge variant={ordersQuery.totalCount > 0 ? "success" : "warning"}>
          {`objednávky: ${ordersQuery.totalCount}`}
        </Badge>
      </div>

      {ordersQuery.error && <ErrorText showIcon>{ordersQuery.error}</ErrorText>}

      <div className="flex flex-wrap gap-200">
        <LinkButton as={NextLink} href="/account/orders" variant="secondary">
          Otvoriť objednávky
        </LinkButton>
        <LinkButton
          as={NextLink}
          href="/checkout"
          theme="outlined"
          variant="secondary"
        >
          Prejsť na checkout
        </LinkButton>
      </div>
    </StorefrontAccountSurface>
  );
}
