"use client"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import Link from "next/link"
import { formatShippingPrice } from "@/lib/checkout-shipping-pricing"
import type {
  CheckoutAddressData,
  PaymentMethod,
  ReducedShippingMethod,
} from "@/types/checkout"

interface OrderSummaryProps {
  addressData?: CheckoutAddressData
  selectedShipping: ReducedShippingMethod | undefined
  selectedPayment: PaymentMethod | undefined
  onCompleteClick: () => void
  onEditClick: () => void
  isOrderComplete?: boolean
  orderNumber?: string
  isLoading?: boolean
}

export function OrderSummary({
  addressData,
  selectedShipping,
  selectedPayment,
  onEditClick,
  onCompleteClick,
  isOrderComplete = false,
  orderNumber,
  isLoading = false,
}: OrderSummaryProps) {
  if (!(addressData && addressData.shipping)) {
    return (
      <div className="fade-in slide-in-from-bottom-2 animate-in duration-300">
        <div className="rounded-lg bg-surface p-4 sm:p-6">
          <h2 className="mb-4 font-bold text-lg sm:mb-6 sm:text-xl">
            Zkontrolujte objednávku
          </h2>
          <p className="text-fg-secondary text-sm">
            Nejprve vyplňte všechny potřebné údaje.
          </p>
        </div>
      </div>
    )
  }

  const shippingPrice = formatShippingPrice(selectedShipping)

  // Order complete state
  if (isOrderComplete && orderNumber) {
    const deliveryDate = new Date()
    deliveryDate.setDate(deliveryDate.getDate() + 3) // Add 3 days for delivery

    return (
      <div className="fade-in slide-in-from-bottom-2 animate-in duration-300">
        <div className="rounded-lg bg-surface p-4 sm:p-6">
          <div className="mb-4 text-center sm:mb-6">
            <div className="no-print mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success sm:mb-4 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
              <Icon className="text-white sm:text-lg" icon="token-icon-check" />
            </div>
            <h2 className="mb-4 font-bold text-lg sm:mb-6 sm:text-xl">
              Objednávka byla úspěšně odeslána!
            </h2>
            <p className="mt-2 font-semibold text-fg-primary sm:text-lg">
              Číslo objednávky: #{orderNumber}
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold text-fg-primary">
                Předpokládané doručení
              </h3>
              <p className="text-fg-secondary text-sm">
                {deliveryDate.toLocaleDateString("cs-CZ", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-fg-primary">
                Co bude následovat?
              </h3>
              <ul className="space-y-2 text-fg-secondary text-sm">
                <li className="flex items-center gap-2">
                  <Icon icon="token-icon-circle-md" />
                  <span>Obdržíte e-mail s potvrzením objednávky</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon="token-icon-circle-md" />
                  <span>
                    Jakmile bude objednávka odeslána, pošleme vám sledovací
                    číslo
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon icon="token-icon-circle-md" />
                  <span>Můžete sledovat stav objednávky ve svém účtu</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-fg-primary">
                Souhrn objednávky
              </h3>
              <div className="space-y-1">
                <p className="text-fg-secondary text-sm">
                  <strong>Doručovací adresa:</strong>
                  <br />
                  {addressData.shipping.firstName}{" "}
                  {addressData.shipping.lastName}
                  <br />
                  {addressData.shipping.street}, {addressData.shipping.city}{" "}
                  {addressData.shipping.postalCode}
                </p>
                <p className="text-fg-secondary text-sm">
                  <strong>Způsob dopravy:</strong> {selectedShipping?.name}
                </p>
                <p className="text-fg-secondary text-sm">
                  <strong>Způsob platby:</strong> {selectedPayment?.name}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:gap-4">
            <Button
              className="hidden sm:flex"
              icon="token-icon-printer"
              onClick={() => {
                // Add print date to body for CSS
                document.body.setAttribute(
                  "data-print-date",
                  new Date().toLocaleDateString("cs-CZ")
                )
                window.print()
                // Clean up after print
                setTimeout(() => {
                  document.body.removeAttribute("data-print-date")
                }, 1000)
              }}
              size="sm"
              variant="secondary"
            >
              Vytisknout potvrzení
            </Button>
            <LinkButton
              as={Link}
              className="w-full gap-2 rounded-sm text-md sm:flex-1"
              href="/products"
              icon="token-icon-shopping-bag"
              size="sm"
              variant="primary"
            >
              Pokračovat v nákupu
            </LinkButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in slide-in-from-bottom-2 animate-in duration-300">
      <div className="rounded-lg bg-surface p-4 sm:p-6">
        <h2 className="mb-4 font-bold text-lg sm:mb-6 sm:text-xl">
          Zkontrolujte objednávku
        </h2>

        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="mb-2 font-semibold text-fg-primary">
              Doručovací adresa
            </h3>
            <p className="text-fg-secondary text-sm">
              {addressData.shipping.firstName} {addressData.shipping.lastName}
              <br />
              {addressData.shipping.company && (
                <>
                  {addressData.shipping.company}
                  <br />
                </>
              )}
              {addressData.shipping.street}
              <br />
              {addressData.shipping.city}, {addressData.shipping.postalCode}
              <br />
              {addressData.shipping.email && (
                <>
                  {addressData.shipping.email}
                  <br />
                </>
              )}
              {addressData.shipping.phone && addressData.shipping.phone}
            </p>
          </div>

          {!addressData.useSameAddress && addressData.billing && (
            <div>
              <h3 className="mb-2 font-semibold text-fg-primary">
                Fakturační adresa
              </h3>
              <p className="text-fg-secondary text-sm">
                {addressData.billing.firstName} {addressData.billing.lastName}
                <br />
                {addressData.billing.company && (
                  <>
                    {addressData.billing.company}
                    <br />
                  </>
                )}
                {addressData.billing.street}
                <br />
                {addressData.billing.city}, {addressData.billing.postalCode}
              </p>
            </div>
          )}

          <div>
            <h3 className="mb-2 font-semibold text-fg-primary">Doprava</h3>
            <p className="text-fg-secondary text-sm">
              {selectedShipping?.name} - {shippingPrice}
              <br />
              Očekávané doručení: 1-2 dny
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-fg-primary">Platba</h3>
            <p className="text-fg-secondary text-sm">
              {selectedPayment?.name}{" "}
              {selectedPayment?.fee ? `(+${selectedPayment.fee} Kč)` : ""}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:gap-4">
          <Button
            className="w-full sm:w-auto"
            onClick={onEditClick}
            size="sm"
            variant="secondary"
          >
            Upravit údaje
          </Button>
          <Button
            className="w-full sm:flex-1"
            disabled={isLoading}
            icon="icon-[mdi--lock-outline]"
            isLoading={isLoading}
            onClick={onCompleteClick}
            size="sm"
          >
            <span className="flex items-center gap-2">Dokončit objednávku</span>
          </Button>{" "}
        </div>
      </div>
    </div>
  )
}
