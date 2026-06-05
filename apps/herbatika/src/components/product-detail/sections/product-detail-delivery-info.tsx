"use client";

import { Icon } from "@techsio/ui-kit/atoms/icon";
import type {
  ProductOfferState,
  ProductWarehouseStock,
} from "@/components/product-detail/product-detail.types";
import { SupportingText } from "@/components/text/supporting-text";

type ProductDetailDeliveryInfoProps = {
  freeShippingThresholdLabel: string | null;
  offerState: ProductOfferState;
};

const formatStockCountLabel = (stockAmount: number | null) => {
  const amountLabel = formatStockAmountLabel(stockAmount);

  return amountLabel ? `celkovo ${amountLabel}` : null;
};

const formatStockAmountLabel = (stockAmount: number | null) => {
  if (
    typeof stockAmount !== "number" ||
    !Number.isFinite(stockAmount) ||
    stockAmount <= 0
  ) {
    return null;
  }

  const displayAmount = Math.floor(stockAmount);

  if (displayAmount <= 0) {
    return null;
  }

  return `${new Intl.NumberFormat("sk-SK", {
    maximumFractionDigits: 0,
  }).format(displayAmount)} ks`;
};

const formatWarehouseName = (name: string) => {
  return name.trim().toLowerCase() === "default stock" ? "Hlavný sklad" : name;
};

const resolveVisibleWarehouseStock = (
  warehouses: ProductWarehouseStock[],
) => {
  return warehouses
    .map((warehouse) => ({
      ...warehouse,
      displayName: formatWarehouseName(warehouse.name),
      stockAmountLabel: formatStockAmountLabel(warehouse.quantity),
    }))
    .filter(
      (
        warehouse,
      ): warehouse is ProductWarehouseStock & {
        displayName: string;
        stockAmountLabel: string;
      } =>
        Boolean(warehouse.stockAmountLabel),
    )
    .slice(0, 3);
};

export function ProductDetailDeliveryInfo({
  freeShippingThresholdLabel,
  offerState,
}: ProductDetailDeliveryInfoProps) {
  const availabilityToneClass = offerState.isInStock ? "text-primary" : "text-warning";
  const deliveryDateMatch = /^u vás do\s+(.+)$/i.exec(offerState.deliveryLabel);
  const stockCountLabel = offerState.isInStock
    ? formatStockCountLabel(offerState.stockAmount)
    : null;
  const visibleWarehouseStock = offerState.isInStock
    ? resolveVisibleWarehouseStock(offerState.warehouseStock)
    : [];

  return (
    <div className="rounded-lg bg-surface p-550">
      <div className="flex flex-wrap items-start gap-650 lg:max-lg:flex lg:max-lg:flex-col">
        <div className="flex gap-200 items-start">
          <Icon
            className={`text-icon-delivery-size leading-none self-start ${offerState.isInStock ? "text-primary" : "text-warning"}`}
            icon={offerState.isInStock ? "token-icon-check" : "token-icon-alert"}
          />
          <div className="min-w-0 space-y-150">
            <SupportingText className="text-md leading-snug text-fg-primary">
              <span className={`font-semibold ${availabilityToneClass}`}>
                {offerState.availabilityLabel}
              </span>
              {stockCountLabel ? (
                <span className={`font-semibold ${availabilityToneClass}`}>
                  {`, ${stockCountLabel}`}
                </span>
              ) : null}
              {deliveryDateMatch ? (
                <>
                  <span className="font-normal text-fg-secondary">, u vás do </span>
                  <span className="font-semibold text-fg-primary">{deliveryDateMatch[1]}</span>
                </>
              ) : (
                <span className="font-normal text-fg-secondary">{`, ${offerState.deliveryLabel}`}</span>
              )}
            </SupportingText>

            {visibleWarehouseStock.length > 0 ? (
              <div className="flex min-w-0 flex-wrap gap-x-350 gap-y-100">
                {visibleWarehouseStock.map((warehouse) => (
                  <SupportingText
                    className="text-sm leading-snug text-fg-secondary"
                    key={`${warehouse.name}-${warehouse.stockAmountLabel}`}
                  >
                    <span className="font-semibold text-fg-primary">
                      {warehouse.displayName}
                    </span>
                    {`: ${warehouse.stockAmountLabel}`}
                  </SupportingText>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {freeShippingThresholdLabel ? (
          <div className="flex items-center gap-200">
            <Icon className="text-primary self-start" icon="token-icon-truck-delivery text-icon-delivery-size" />
            <SupportingText className="text-md leading-snug text-fg-secondary">
              Doručenie zdarma nad <span className="font-semibold text-primary">{freeShippingThresholdLabel}</span>
            </SupportingText>
          </div>
        ) : null}
      </div>
    </div>
  );
}
