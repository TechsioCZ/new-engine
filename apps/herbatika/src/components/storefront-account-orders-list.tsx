"use client";

import type { HttpTypes } from "@medusajs/types";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { Pagination } from "@techsio/ui-kit/molecules/pagination";
import { Table } from "@techsio/ui-kit/organisms/table";
import NextLink from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import {
  formatOrderAmount,
  formatOrderDate,
  resolveOrderItemCount,
  resolveOrderStatusBadgeVariant,
  resolveOrderStatusLabel,
  resolveOrderTotalAmount,
} from "@/lib/storefront/order-format";
import { storefrontCacheConfig } from "@/lib/storefront/cache";
import { useAuth } from "@/lib/storefront/auth";
import {
  orderQueryKeys,
  orderService,
  useOrders,
} from "@/lib/storefront/orders";

const ORDER_PAGE_SIZE = 10;

const resolvePageFromSearch = (value: string | null) => {
  if (!value) {
    return 1;
  }

  const parsedPage = Number.parseInt(value, 10);
  if (!Number.isFinite(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
};

const resolveOrderDisplayId = (order: HttpTypes.StoreOrder) => {
  if (order.display_id) {
    return `#${order.display_id}`;
  }

  return order.id;
};

export function StorefrontAccountOrdersList() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authQuery = useAuth();
  const searchQuery = searchParams.toString();
  const currentPage = resolvePageFromSearch(searchParams.get("page"));
  const ordersQuery = useOrders({
    page: currentPage,
    limit: ORDER_PAGE_SIZE,
    enabled: authQuery.isAuthenticated,
  });

  const setPage = useCallback(
    (nextPage: number, replaceHistoryEntry = false) => {
      const normalizedPage = Math.max(1, nextPage);
      const nextParams = new URLSearchParams(searchQuery);

      if (normalizedPage <= 1) {
        nextParams.delete("page");
      } else {
        nextParams.set("page", String(normalizedPage));
      }

      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

      if (replaceHistoryEntry) {
        router.replace(nextUrl);
        return;
      }

      router.push(nextUrl);
    },
    [pathname, router, searchQuery],
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
      void queryClient.prefetchQuery({
        queryKey: orderQueryKeys.detail({ id: orderId }),
        queryFn: ({ signal }) => orderService.getOrder({ id: orderId }, signal),
        ...storefrontCacheConfig.userData,
      });
    },
    [queryClient],
  );

  if (authQuery.isLoading || (ordersQuery.isLoading && currentPage === 1)) {
    return (
      <section className="rounded-xl border border-black/10 bg-white p-6">
        <Skeleton>
          <Skeleton.Text noOfLines={8} />
        </Skeleton>
      </section>
    );
  }

  if (ordersQuery.error) {
    return (
      <section className="space-y-4 rounded-xl border border-black/10 bg-white p-6">
        <ErrorText showIcon>{ordersQuery.error}</ErrorText>
        <Button
          onClick={() => {
            void ordersQuery.query.refetch();
          }}
          variant="secondary"
        >
          Skúsiť znova
        </Button>
      </section>
    );
  }

  if (ordersQuery.orders.length === 0) {
    return (
      <section className="space-y-4 rounded-xl border border-black/10 bg-white p-6">
        <h2 className="text-lg font-semibold">Objednávky</h2>
        <p className="text-sm text-fg-secondary">
          Zatiaľ nemáte žiadnu dokončenú objednávku.
        </p>
        <LinkButton as={NextLink} href="/" variant="secondary">
          Prejsť na produkty
        </LinkButton>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-black/10 bg-white p-6">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold">Objednávky</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">{`celkom: ${ordersQuery.totalCount}`}</Badge>
          <Badge variant="info">{`strana: ${ordersQuery.currentPage}/${ordersQuery.totalPages}`}</Badge>
        </div>
      </header>

      <div className="overflow-x-auto">
        <Table size="sm" variant="outline">
          <Table.Caption>Zoznam vašich objednávok</Table.Caption>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Objednávka</Table.ColumnHeader>
              <Table.ColumnHeader>Dátum</Table.ColumnHeader>
              <Table.ColumnHeader>Stav</Table.ColumnHeader>
              <Table.ColumnHeader numeric>Položky</Table.ColumnHeader>
              <Table.ColumnHeader numeric>Suma</Table.ColumnHeader>
              <Table.ColumnHeader>Akcia</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {ordersQuery.orders.map((order) => {
              const orderTotalAmount = resolveOrderTotalAmount(order);
              const orderItemCount = resolveOrderItemCount(order.items);
              const detailHref = `/account/orders/${order.id}`;

              return (
                <Table.Row key={order.id}>
                  <Table.Cell>{resolveOrderDisplayId(order)}</Table.Cell>
                  <Table.Cell>{formatOrderDate(order.created_at)}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={resolveOrderStatusBadgeVariant(order.status)}>
                      {resolveOrderStatusLabel(order.status)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell numeric>{String(orderItemCount)}</Table.Cell>
                  <Table.Cell numeric>
                    {formatOrderAmount(orderTotalAmount, order.currency_code)}
                  </Table.Cell>
                  <Table.Cell>
                    <LinkButton
                      as={NextLink}
                      href={detailHref}
                      onFocus={() => {
                        prefetchOrderDetail(order.id);
                      }}
                      onMouseEnter={() => {
                        prefetchOrderDetail(order.id);
                      }}
                      size="sm"
                      theme="outlined"
                      variant="secondary"
                    >
                      Detail
                    </LinkButton>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
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
    </section>
  );
}
