"use client";

import { StatusText } from "@techsio/ui-kit/atoms/status-text";
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

      <ul className="flex flex-col flex-wrap gap-200">
        <li>
          <span>Zákazník: </span>
          <span className="text-fg-secondary">{`${authQuery.customer.first_name ?? ""} ${authQuery.customer.last_name ?? ""}`.trim() ||
            "Zákazník"}</span>
        </li>
        <li>
          <span>Email: </span>
          <span className="text-fg-secondary">{authQuery.customer.email ?? "-"}</span>
        </li>
        <li>
          <span>Objednávky: </span>
          <span className="text-fg-secondary">{`${ordersQuery.totalCount}`}</span>
        </li>
      </ul>

      {ordersQuery.error && (
        <StatusText showIcon status="error">
          {ordersQuery.error}
        </StatusText>
      )}
    </StorefrontAccountSurface>
  );
}
