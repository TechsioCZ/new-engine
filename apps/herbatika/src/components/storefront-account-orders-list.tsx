"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { Pagination } from "@techsio/ui-kit/molecules/pagination";
import NextLink from "next/link";
import { parseAsInteger, useQueryState } from "nuqs";
import { useCallback, useEffect } from "react";
import { StorefrontAccountOrderGroup } from "@/components/account/orders/storefront-account-order-group";
import {
  StorefrontAccountSkeletonSurface,
  StorefrontAccountSurface,
} from "@/components/account/storefront-account-surface";
import { useAuth } from "@/lib/storefront/auth";
import {
  getOrderDetailQueryOptions,
  useOrders,
} from "@/lib/storefront/orders";

const ORDER_PAGE_SIZE = 10;

export function StorefrontAccountOrdersList() {
  const queryClient = useQueryClient();
  const authQuery = useAuth();
  const [currentPage, setCurrentPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1),
  );
  const ordersQuery = useOrders({
    page: currentPage,
    limit: ORDER_PAGE_SIZE,
    enabled: authQuery.isAuthenticated,
  });

  const setPage = useCallback(
    (nextPage: number, replaceHistoryEntry = false) => {
      const normalizedPage = Math.max(1, nextPage);
      void setCurrentPage(normalizedPage, {
        history: replaceHistoryEntry ? "replace" : "push",
      });
    },
    [setCurrentPage],
  );

  useEffect(() => {
    if (ordersQuery.totalPages < 1) {
      return;
    }

    if (currentPage <= ordersQuery.totalPages) {
      return;
    }

    setPage(ordersQuery.totalPages, true);
  }, [currentPage, ordersQuery.totalPages, setPage]);

  const prefetchOrderDetail = useCallback(
    (orderId: string) => {
      void queryClient.prefetchQuery(getOrderDetailQueryOptions({ id: orderId }));
    },
    [queryClient],
  );

  if (authQuery.isLoading || (ordersQuery.isLoading && currentPage === 1)) {
    return <StorefrontAccountSkeletonSurface lines={8} />;
  }

  if (ordersQuery.error) {
    return (
      <StorefrontAccountSurface className="space-y-400">
        <StatusText showIcon status="error">
          {ordersQuery.error}
        </StatusText>
        <Button
          onClick={() => {
            void ordersQuery.query.refetch();
          }}
          variant="secondary"
        >
          Skúsiť znova
        </Button>
      </StorefrontAccountSurface>
    );
  }

  if (ordersQuery.orders.length === 0) {
    return (
      <StorefrontAccountSurface className="space-y-400">
        <h2 className="text-lg font-semibold">Objednávky</h2>
        <p className="text-sm text-fg-secondary">
          Zatiaľ nemáte žiadnu dokončenú objednávku.
        </p>
        <LinkButton as={NextLink} href="/" variant="secondary">
          Prejsť na produkty
        </LinkButton>
      </StorefrontAccountSurface>
    );
  }

  return (
    <StorefrontAccountSurface className="space-y-500">
      <header className="space-y-200">
        <h2 className="text-lg font-semibold">Objednávky</h2>
        <p className="text-sm text-fg-secondary">
          Prehľad dokončených objednávok s položkami a stavom doručenia.
        </p>
        <p className="text-fg-tertiary text-xs">{`Celkom: ${ordersQuery.totalCount} | Strana ${ordersQuery.currentPage}/${ordersQuery.totalPages}`}</p>
      </header>

      <div className="space-y-300">
        {ordersQuery.orders.map((order) => {
          return (
            <StorefrontAccountOrderGroup
              key={order.id}
              onPrefetchOrderDetail={prefetchOrderDetail}
              order={order}
            />
          );
        })}
      </div>

      {ordersQuery.totalPages > 1 && (
        <Pagination
          count={ordersQuery.totalCount}
          onPageChange={(nextPage) => {
            if (nextPage === currentPage) {
              return;
            }

            setPage(nextPage);
          }}
          page={ordersQuery.currentPage}
          pageSize={ORDER_PAGE_SIZE}
          size="sm"
          variant="outlined"
        />
      )}
    </StorefrontAccountSurface>
  );
}
