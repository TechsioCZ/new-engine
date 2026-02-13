"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import NextLink from "next/link";
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
    return (
      <section className="rounded-xl border border-black/10 bg-white p-6">
        <Skeleton>
          <Skeleton.Text noOfLines={4} />
        </Skeleton>
      </section>
    );
  }

  if (!authQuery.customer) {
    return null;
  }

  return (
    <section className="space-y-5 rounded-xl border border-black/10 bg-white p-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold">Prehľad účtu</h2>
        <p className="text-sm text-fg-secondary">
          Správa objednávok a údajov zákazníka.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
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

      <div className="flex flex-wrap gap-2">
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
    </section>
  );
}
