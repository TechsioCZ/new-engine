"use client";

import type { HttpTypes } from "@medusajs/types";
import { useQueryClient } from "@tanstack/react-query";
import { useRegionContext } from "@techsio/storefront-data/shared";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import NextLink from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/storefront/auth";
import {
  fetchPaymentProviders,
  useCheckoutPayment,
  useCheckoutShipping,
} from "@/lib/storefront/checkout";
import {
  useCart,
  useCompleteCart,
  useUpdateCartAddress,
} from "@/lib/storefront/cart";

type AddressFormState = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  postalCode: string;
  countryCode: string;
};

const DEFAULT_ADDRESS_FORM: AddressFormState = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  postalCode: "",
  countryCode: "SK",
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const resolveErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (isObject(error) && typeof error.message === "string") {
    return error.message;
  }

  return "An unknown error occurred.";
};

const resolveCartTotalMinor = (cart: HttpTypes.StoreCart | null | undefined) => {
  if (!cart) {
    return 0;
  }

  if (typeof cart.total === "number") {
    return cart.total;
  }

  if (typeof cart.subtotal === "number") {
    return cart.subtotal;
  }

  return 0;
};

const resolveLineItemTotalMinor = (item: HttpTypes.StoreCartLineItem) => {
  if (typeof item.total === "number") {
    return item.total;
  }

  if (typeof item.subtotal === "number") {
    return item.subtotal;
  }

  const unitPrice = typeof item.unit_price === "number" ? item.unit_price : 0;
  const quantity = typeof item.quantity === "number" ? item.quantity : 1;
  return unitPrice * quantity;
};

const formatMinor = (minor: number, currencyCode?: string | null) => {
  const code = (currencyCode ?? "EUR").toUpperCase();
  const locale = code === "CZK" ? "cs-CZ" : "sk-SK";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
};

const resolveOrderId = (result: unknown) => {
  if (!isObject(result)) {
    return null;
  }

  if (result.type === "order" && isObject(result.order) && typeof result.order.id === "string") {
    return result.order.id;
  }

  if (isObject(result.order) && typeof result.order.id === "string") {
    return result.order.id;
  }

  return null;
};

const resolveCompleteCartFailure = (result: unknown) => {
  if (!isObject(result)) {
    return null;
  }

  if (result.type === "cart" && isObject(result.error) && typeof result.error.message === "string") {
    return result.error.message;
  }

  return null;
};

const buildMissingFieldMessage = (form: AddressFormState) => {
  const missing: string[] = [];

  if (!form.email.trim()) {
    missing.push("email");
  }
  if (!form.firstName.trim()) {
    missing.push("meno");
  }
  if (!form.lastName.trim()) {
    missing.push("priezvisko");
  }
  if (!form.address1.trim()) {
    missing.push("ulica");
  }
  if (!form.city.trim()) {
    missing.push("mesto");
  }
  if (!form.postalCode.trim()) {
    missing.push("PSČ");
  }
  if (!form.countryCode.trim()) {
    missing.push("krajina");
  }

  if (missing.length === 0) {
    return null;
  }

  return `Vyplňte povinné polia: ${missing.join(", ")}`;
};

export function StorefrontCheckoutFlow() {
  const queryClient = useQueryClient();
  const region = useRegionContext();
  const authQuery = useAuth();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(
    DEFAULT_ADDRESS_FORM,
  );
  const [isAddressInitialized, setIsAddressInitialized] = useState(false);

  const cartQuery = useCart({
    autoCreate: true,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });

  const updateCartAddressMutation = useUpdateCartAddress();
  const completeCartMutation = useCompleteCart({
    clearCartOnSuccess: true,
  });

  const checkoutShippingQuery = useCheckoutShipping({
    cartId: cartQuery.cart?.id,
    cart: cartQuery.cart,
    enabled: Boolean(cartQuery.cart?.id),
  });

  const activeRegionId = cartQuery.cart?.region_id ?? region?.region_id;

  const checkoutPaymentQuery = useCheckoutPayment({
    cartId: cartQuery.cart?.id,
    cart: cartQuery.cart,
    regionId: activeRegionId,
    enabled: Boolean(activeRegionId),
  });

  useEffect(() => {
    if (!activeRegionId) {
      return;
    }

    void fetchPaymentProviders(queryClient, activeRegionId).catch(() => {
      // Best-effort prefetch only.
    });
  }, [activeRegionId, queryClient]);

  useEffect(() => {
    if (isAddressInitialized) {
      return;
    }

    if (cartQuery.isLoading) {
      return;
    }

    const billingAddress = cartQuery.cart?.billing_address;
    const shippingAddress = cartQuery.cart?.shipping_address;
    const baseAddress = billingAddress ?? shippingAddress;

    setAddressForm((previous) => ({
      ...previous,
      email: cartQuery.cart?.email ?? authQuery.customer?.email ?? previous.email,
      firstName:
        baseAddress?.first_name ?? authQuery.customer?.first_name ?? previous.firstName,
      lastName:
        baseAddress?.last_name ?? authQuery.customer?.last_name ?? previous.lastName,
      phone: baseAddress?.phone ?? previous.phone,
      company: baseAddress?.company ?? previous.company,
      address1: baseAddress?.address_1 ?? previous.address1,
      address2: baseAddress?.address_2 ?? previous.address2,
      city: baseAddress?.city ?? previous.city,
      postalCode: baseAddress?.postal_code ?? previous.postalCode,
      countryCode:
        (baseAddress?.country_code ?? region?.country_code ?? previous.countryCode).toUpperCase(),
    }));
    setIsAddressInitialized(true);
  }, [
    authQuery.customer?.email,
    authQuery.customer?.first_name,
    authQuery.customer?.last_name,
    cartQuery.cart,
    cartQuery.isLoading,
    isAddressInitialized,
    region?.country_code,
  ]);

  const currencyCode = useMemo(() => {
    return (cartQuery.cart?.currency_code ?? "eur").toUpperCase();
  }, [cartQuery.cart?.currency_code]);

  const isBusy =
    cartQuery.isFetching ||
    updateCartAddressMutation.isPending ||
    checkoutShippingQuery.isSettingShipping ||
    checkoutPaymentQuery.isInitiatingPayment ||
    completeCartMutation.isPending;

  const updateAddressField = <K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) => {
    setAddressForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSaveAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckoutError(null);
    setCheckoutMessage(null);
    setCompletedOrderId(null);

    if (!cartQuery.cart?.id) {
      setCheckoutError("Košík není připraven.");
      return;
    }

    const missingFieldsMessage = buildMissingFieldMessage(addressForm);
    if (missingFieldsMessage) {
      setCheckoutError(missingFieldsMessage);
      return;
    }

    const normalizedAddress = {
      first_name: addressForm.firstName.trim(),
      last_name: addressForm.lastName.trim(),
      phone: addressForm.phone.trim() || undefined,
      company: addressForm.company.trim() || undefined,
      address_1: addressForm.address1.trim(),
      address_2: addressForm.address2.trim() || undefined,
      city: addressForm.city.trim(),
      postal_code: addressForm.postalCode.trim(),
      country_code: addressForm.countryCode.trim().toLowerCase(),
    };

    try {
      await updateCartAddressMutation.mutateAsync({
        cartId: cartQuery.cart.id,
        email: addressForm.email.trim(),
        shippingAddress: normalizedAddress,
        billingAddress: normalizedAddress,
        useSameAddress: true,
      });
      setCheckoutMessage("Adresa bola uložená.");
    } catch (error) {
      setCheckoutError(resolveErrorMessage(error));
    }
  };

  const handleSelectShipping = async (optionId: string) => {
    setCheckoutError(null);
    setCheckoutMessage(null);
    setCompletedOrderId(null);

    try {
      await checkoutShippingQuery.setShippingMethodAsync(optionId);
      setCheckoutMessage("Doprava bola vybraná.");
    } catch (error) {
      setCheckoutError(resolveErrorMessage(error));
    }
  };

  const handleSelectPaymentProvider = async (providerId: string) => {
    setCheckoutError(null);
    setCheckoutMessage(null);
    setCompletedOrderId(null);

    if (!checkoutPaymentQuery.canInitiatePayment) {
      setCheckoutError("Najprv vyberte dopravu.");
      return;
    }

    try {
      await checkoutPaymentQuery.initiatePaymentAsync(providerId);
      setCheckoutMessage("Platba bola inicializovaná.");
    } catch (error) {
      setCheckoutError(resolveErrorMessage(error));
    }
  };

  const handleCompleteOrder = async () => {
    setCheckoutError(null);
    setCheckoutMessage(null);
    setCompletedOrderId(null);

    if (!cartQuery.cart?.id) {
      setCheckoutError("Košík není připraven.");
      return;
    }

    if (cartQuery.itemCount < 1) {
      setCheckoutError("Košík je prázdny. Pridajte najprv produkty.");
      return;
    }

    if (!checkoutShippingQuery.selectedShippingMethodId) {
      setCheckoutError("Vyberte dopravu pred dokončením objednávky.");
      return;
    }

    if (!checkoutPaymentQuery.hasPaymentSessions) {
      setCheckoutError("Vyberte platobnú metódu pred dokončením objednávky.");
      return;
    }

    try {
      const completeResult = await completeCartMutation.mutateAsync({
        cartId: cartQuery.cart.id,
      });

      const orderId = resolveOrderId(completeResult);
      if (orderId) {
        setCompletedOrderId(orderId);
        setCheckoutMessage(`Objednávka bola vytvorená (${orderId}).`);
        return;
      }

      const completionFailureMessage = resolveCompleteCartFailure(completeResult);
      if (completionFailureMessage) {
        setCheckoutError(completionFailureMessage);
        return;
      }

      setCheckoutError("Dokončenie objednávky zlyhalo.");
    } catch (error) {
      setCheckoutError(resolveErrorMessage(error));
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="text-sm text-fg-secondary">
          Storefront checkout flow: adresa, doprava, platba, dokončenie objednávky.
        </p>
      </header>

      <section className="flex flex-wrap gap-2">
        <Badge variant={cartQuery.cart?.id ? "success" : "warning"}>
          {`cart: ${cartQuery.cart?.id ? "ready" : "missing"}`}
        </Badge>
        <Badge variant={cartQuery.itemCount > 0 ? "success" : "warning"}>
          {`items: ${cartQuery.itemCount}`}
        </Badge>
        <Badge variant={checkoutShippingQuery.selectedShippingMethodId ? "success" : "info"}>
          {`shipping: ${checkoutShippingQuery.selectedShippingMethodId ? "selected" : "not selected"}`}
        </Badge>
        <Badge variant={checkoutPaymentQuery.hasPaymentSessions ? "success" : "info"}>
          {`payment: ${checkoutPaymentQuery.hasPaymentSessions ? "ready" : "not initialized"}`}
        </Badge>
      </section>

      {checkoutMessage && (
        <Badge className="w-fit rounded-full px-3 py-1 text-xs font-semibold" variant="success">
          {checkoutMessage}
        </Badge>
      )}

      {checkoutError && <ErrorText showIcon>{checkoutError}</ErrorText>}

      {cartQuery.error && <ErrorText showIcon>{cartQuery.error}</ErrorText>}

      {completedOrderId && (
        <section className="space-y-3 rounded-xl border border-black/10 bg-white p-4">
          <h2 className="text-lg font-semibold">Objednávka dokončená</h2>
          <ExtraText>{`Order id: ${completedOrderId}`}</ExtraText>
          <div className="flex flex-wrap gap-2">
            <LinkButton as={NextLink} href="/" variant="secondary">
              Pokračovať v nákupe
            </LinkButton>
            <LinkButton as={NextLink} href="/account" theme="outlined" variant="secondary">
              Prejsť na účet
            </LinkButton>
          </div>
        </section>
      )}

      {!completedOrderId && cartQuery.itemCount < 1 && (
        <section className="space-y-3 rounded-xl border border-black/10 bg-white p-4">
          <h2 className="text-lg font-semibold">Košík je prázdny</h2>
          <ExtraText>Pred checkoutom pridajte aspoň jeden produkt.</ExtraText>
          <div className="flex flex-wrap gap-2">
            <LinkButton as={NextLink} href="/" variant="secondary">
              Ísť na domovskú stránku
            </LinkButton>
            <LinkButton as={NextLink} href="/test-page" theme="outlined" variant="secondary">
              Otvoriť test-page
            </LinkButton>
          </div>
        </section>
      )}

      {!completedOrderId && cartQuery.itemCount > 0 && (
        <>
          <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4">
            <h2 className="text-lg font-semibold">1. Fakturačné a doručovacie údaje</h2>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSaveAddress}>
              <FormInput
                id="checkout-email"
                label="Email"
                name="email"
                required
                type="email"
                value={addressForm.email}
                onChange={(event) => updateAddressField("email", event.target.value)}
              />
              <FormInput
                id="checkout-phone"
                label="Telefón"
                name="phone"
                type="tel"
                value={addressForm.phone}
                onChange={(event) => updateAddressField("phone", event.target.value)}
              />
              <FormInput
                id="checkout-first-name"
                label="Meno"
                name="first_name"
                required
                type="text"
                value={addressForm.firstName}
                onChange={(event) => updateAddressField("firstName", event.target.value)}
              />
              <FormInput
                id="checkout-last-name"
                label="Priezvisko"
                name="last_name"
                required
                type="text"
                value={addressForm.lastName}
                onChange={(event) => updateAddressField("lastName", event.target.value)}
              />
              <FormInput
                id="checkout-company"
                label="Firma"
                name="company"
                type="text"
                value={addressForm.company}
                onChange={(event) => updateAddressField("company", event.target.value)}
              />
              <FormInput
                id="checkout-address-1"
                label="Ulica"
                name="address_1"
                required
                type="text"
                value={addressForm.address1}
                onChange={(event) => updateAddressField("address1", event.target.value)}
              />
              <FormInput
                id="checkout-address-2"
                label="Ulica 2"
                name="address_2"
                type="text"
                value={addressForm.address2}
                onChange={(event) => updateAddressField("address2", event.target.value)}
              />
              <FormInput
                id="checkout-city"
                label="Mesto"
                name="city"
                required
                type="text"
                value={addressForm.city}
                onChange={(event) => updateAddressField("city", event.target.value)}
              />
              <FormInput
                id="checkout-postal-code"
                label="PSČ"
                name="postal_code"
                required
                type="text"
                value={addressForm.postalCode}
                onChange={(event) => updateAddressField("postalCode", event.target.value)}
              />
              <FormInput
                id="checkout-country-code"
                label="Krajina (ISO)"
                name="country_code"
                required
                type="text"
                value={addressForm.countryCode}
                onChange={(event) =>
                  updateAddressField("countryCode", event.target.value.toUpperCase())
                }
              />

              <div className="md:col-span-2">
                <Button
                  disabled={isBusy || !cartQuery.cart?.id}
                  isLoading={updateCartAddressMutation.isPending}
                  type="submit"
                >
                  Uložiť adresu
                </Button>
              </div>
            </form>
          </section>

          <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4">
            <h2 className="text-lg font-semibold">2. Doprava</h2>
            <div className="grid gap-2">
              {checkoutShippingQuery.shippingOptions.length > 0 ? (
                checkoutShippingQuery.shippingOptions.map((option) => {
                  const optionPrice = checkoutShippingQuery.shippingPrices[option.id] ?? 0;
                  const isSelected =
                    checkoutShippingQuery.selectedShippingMethodId === option.id;

                  return (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 p-3"
                      key={option.id}
                    >
                      <div className="space-y-1">
                        <p className="font-medium">
                          {option.name ?? option.id}
                        </p>
                        <ExtraText>{formatMinor(optionPrice, currencyCode)}</ExtraText>
                      </div>
                      <Button
                        disabled={isBusy}
                        isLoading={checkoutShippingQuery.isSettingShipping && isSelected}
                        onClick={() => {
                          void handleSelectShipping(option.id);
                        }}
                        theme={isSelected ? "solid" : "outlined"}
                        type="button"
                        variant={isSelected ? "primary" : "secondary"}
                      >
                        {isSelected ? "Zvolená doprava" : "Vybrať dopravu"}
                      </Button>
                    </div>
                  );
                })
              ) : (
                <ExtraText>Nie sú dostupné žiadne možnosti dopravy.</ExtraText>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4">
            <h2 className="text-lg font-semibold">3. Platba</h2>
            <div className="grid gap-2">
              {checkoutPaymentQuery.paymentProviders.length > 0 ? (
                checkoutPaymentQuery.paymentProviders.map((provider) => {
                  const providerId =
                    "id" in provider && typeof provider.id === "string"
                      ? provider.id
                      : "";
                  const providerLabel =
                    "id" in provider && typeof provider.id === "string"
                      ? provider.id
                      : "unknown-provider";

                  return (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 p-3"
                      key={providerLabel}
                    >
                      <p className="font-medium">{providerLabel}</p>
                      <Button
                        disabled={isBusy || !providerId || !checkoutPaymentQuery.canInitiatePayment}
                        isLoading={checkoutPaymentQuery.isInitiatingPayment}
                        onClick={() => {
                          void handleSelectPaymentProvider(providerId);
                        }}
                        theme="outlined"
                        type="button"
                        variant="secondary"
                      >
                        Vybrať platbu
                      </Button>
                    </div>
                  );
                })
              ) : (
                <ExtraText>Nie sú dostupné žiadne platobné metódy.</ExtraText>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-black/10 bg-white p-4">
            <h2 className="text-lg font-semibold">4. Súhrn a dokončenie</h2>
            <div className="space-y-2">
              {(cartQuery.cart?.items ?? []).map((item) => {
                const itemName =
                  item.title ??
                  item.product_title ??
                  item.variant_title ??
                  item.id;
                const itemQuantity = item.quantity ?? 0;
                const itemPrice = formatMinor(
                  resolveLineItemTotalMinor(item),
                  currencyCode,
                );

                return (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-2"
                    key={item.id}
                  >
                    <p className="text-sm">
                      {itemName}
                      {` × ${itemQuantity}`}
                    </p>
                    <p className="text-sm font-semibold">{itemPrice}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-black/10 pt-3">
              <p className="font-semibold">Celkom</p>
              <p className="text-lg font-bold">
                {formatMinor(resolveCartTotalMinor(cartQuery.cart), currencyCode)}
              </p>
            </div>

            <Button
              disabled={
                isBusy ||
                !checkoutShippingQuery.selectedShippingMethodId ||
                !checkoutPaymentQuery.hasPaymentSessions
              }
              isLoading={completeCartMutation.isPending}
              onClick={() => {
                void handleCompleteOrder();
              }}
              type="button"
            >
              Dokončiť objednávku
            </Button>
          </section>
        </>
      )}
    </main>
  );
}
