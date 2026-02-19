import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Table } from "@techsio/ui-kit/organisms/table";
import NextLink from "next/link";
import {
  formatOrderAmount,
  formatOrderDate,
  resolveOrderDisplayId,
  resolveOrderItemCount,
  resolveOrderStatusBadgeVariant,
  resolveOrderStatusLabel,
  resolveOrderTotalAmount,
} from "@/lib/storefront/order-format";

type StorefrontAccountOrderRowProps = {
  order: HttpTypes.StoreOrder;
  onPrefetchOrderDetail: (orderId: string) => void;
};

export function StorefrontAccountOrderRow({
  order,
  onPrefetchOrderDetail,
}: StorefrontAccountOrderRowProps) {
  const orderTotalAmount = resolveOrderTotalAmount(order);
  const orderItemCount = resolveOrderItemCount(order.items);
  const detailHref = `/account/orders/${order.id}`;

  return (
    <Table.Row>
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
            onPrefetchOrderDetail(order.id);
          }}
          onMouseEnter={() => {
            onPrefetchOrderDetail(order.id);
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
}
