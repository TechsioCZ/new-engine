"use client";

import type { HttpTypes } from "@medusajs/types";
import { useQueryClient } from "@tanstack/react-query";
import { useRegionContext } from "@techsio/storefront-data/shared";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { Icon } from "@techsio/ui-kit/atoms/icon";
import { Image } from "@techsio/ui-kit/atoms/image";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import { Select, type SelectItem } from "@techsio/ui-kit/molecules/select";
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
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";

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

const COUNTRY_SELECT_ITEMS: SelectItem[] = [
  { value: "SK", label: "Slovensko" },
  { value: "CZ", label: "Česko" },
  { value: "AT", label: "Rakúsko" },
  { value: "HU", label: "Maďarsko" },
];

const CHECKOUT_STEPS = [
  { id: "cart", title: "Košík" },
  { id: "address", title: "Údaje" },
  { id: "shipping", title: "Doprava" },
  { id: "payment", title: "Platba" },
] as const;

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const resolveCartTotalAmount = (cart: HttpTypes.StoreCart | null | undefined) => {
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

const resolveLineItemTotalAmount = (item: HttpTypes.StoreCartLineItem) => {
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

const resolveProviderLabel = (providerId: string) => {
  if (!providerId) {
    return "Neznámy poskytovateľ";
  }

  return providerId
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const resolveCartItemName = (item: HttpTypes.StoreCartLineItem) => {
  return item.title ?? item.product_title ?? item.variant_title ?? item.id;
};

const resolveHasStoredAddress = (cart: HttpTypes.StoreCart | null | undefined) => {
  if (!cart?.email) {
    return false;
  }

  const address = cart.billing_address ?? cart.shipping_address;
  if (!address) {
    return false;
  }

  return Boolean(
    address.first_name &&
      address.last_name &&
      address.address_1 &&
      address.city &&
      address.postal_code &&
      address.country_code,
  );
};

const resolveCheckoutStepIndex = (params: {
  hasItems: boolean;
  hasStoredAddress: boolean;
  hasShipping: boolean;
  hasPayment: boolean;
}) => {
  if (!params.hasItems) {
    return 0;
  }

  if (!params.hasStoredAddress) {
    return 1;
  }

  if (!params.hasShipping) {
    return 2;
  }

  if (!params.hasPayment) {
    return 3;
  }

  return CHECKOUT_STEPS.length - 1;
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
  const [createAccountConsent, setCreateAccountConsent] = useState(false);
  const [acceptTermsConsent, setAcceptTermsConsent] = useState(false);

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

  const cartItems = cartQuery.cart?.items ?? [];
  const hasStoredAddress = resolveHasStoredAddress(cartQuery.cart);
  const hasShipping = Boolean(checkoutShippingQuery.selectedShippingMethodId);
  const hasPayment = checkoutPaymentQuery.hasPaymentSessions;
  const checkoutStepIndex = resolveCheckoutStepIndex({
    hasItems: cartItems.length > 0,
    hasStoredAddress,
    hasShipping,
    hasPayment,
  });

  const selectedShippingPrice = useMemo(() => {
    if (!checkoutShippingQuery.selectedShippingMethodId) {
      return 0;
    }

    return checkoutShippingQuery.shippingPrices[checkoutShippingQuery.selectedShippingMethodId] ?? 0;
  }, [checkoutShippingQuery.selectedShippingMethodId, checkoutShippingQuery.shippingPrices]);

  const cartSubtotalAmount = useMemo(() => {
    if (typeof cartQuery.cart?.subtotal === "number") {
      return cartQuery.cart.subtotal;
    }

    return cartItems.reduce((sum, item) => sum + resolveLineItemTotalAmount(item), 0);
  }, [cartItems, cartQuery.cart?.subtotal]);

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

    if (!acceptTermsConsent) {
      setCheckoutError("Pred dokončením objednávky potvrďte súhlas s obchodnými podmienkami.");
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
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-500 px-400 py-550 lg:px-550">
      <header className="space-y-200">
        <h1 className="text-2xl font-semibold text-fg-primary">Dokončenie objednávky</h1>
        <p className="text-sm text-fg-secondary">
          Vyplňte údaje, zvoľte dopravu a platbu, potom potvrďte objednávku.
        </p>
      </header>

      <section className="grid gap-200 sm:grid-cols-2 xl:grid-cols-4">
        {CHECKOUT_STEPS.map((step, index) => {
          const isComplete = index < checkoutStepIndex;
          const isCurrent = index === checkoutStepIndex;
          const stateLabel = isComplete ? "Hotovo" : isCurrent ? "Aktuálne" : "Čaká";

          return (
            <div
              className={`flex items-center gap-200 rounded-lg border p-250 ${
                isComplete || isCurrent
                  ? "border-primary bg-highlight"
                  : "border-border-secondary bg-surface"
              }`}
              key={step.id}
            >
              <span
                className={`flex size-500 items-center justify-center rounded-full border text-sm font-semibold ${
                  isComplete
                    ? "border-primary bg-primary text-fg-reverse"
                    : isCurrent
                      ? "border-primary text-primary"
                      : "border-border-primary text-fg-tertiary"
                }`}
              >
                {isComplete ? <Icon icon="token-icon-check" /> : index + 1}
              </span>
              <div className="space-y-50">
                <p className="text-sm font-semibold text-fg-primary">{step.title}</p>
                <ExtraText className="text-fg-tertiary">{stateLabel}</ExtraText>
              </div>
            </div>
          );
        })}
      </section>

      {checkoutMessage ? (
        <StatusText showIcon status="success">
          {checkoutMessage}
        </StatusText>
      ) : null}
      {checkoutError ? <ErrorText showIcon>{checkoutError}</ErrorText> : null}
      {cartQuery.error ? <ErrorText showIcon>{cartQuery.error}</ErrorText> : null}

      {completedOrderId ? (
        <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
          <h2 className="text-xl font-semibold text-fg-primary">Objednávka dokončená</h2>
          <StatusText showIcon status="success">
            {`Objednávka bola vytvorená (${completedOrderId}).`}
          </StatusText>
          <div className="flex flex-wrap gap-200">
            <LinkButton as={NextLink} href="/" variant="secondary">
              Pokračovať v nákupe
            </LinkButton>
            <LinkButton as={NextLink} href="/account" theme="outlined" variant="secondary">
              Prejsť na účet
            </LinkButton>
          </div>
        </section>
      ) : null}

      {!completedOrderId && cartItems.length < 1 ? (
        <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
          <h2 className="text-xl font-semibold text-fg-primary">Košík je prázdny</h2>
          <ExtraText>Pred checkoutom pridajte aspoň jeden produkt.</ExtraText>
          <div className="flex flex-wrap gap-200">
            <LinkButton as={NextLink} href="/" variant="secondary">
              Ísť na domovskú stránku
            </LinkButton>
            <LinkButton as={NextLink} href="/c/trapi-ma" theme="outlined" variant="secondary">
              Otvoriť kategóriu
            </LinkButton>
          </div>
        </section>
      ) : null}

      {!completedOrderId && cartItems.length > 0 ? (
        <div className="grid gap-500 xl:grid-cols-3">
          <div className="space-y-350 xl:col-span-2">
            <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
              <header className="flex flex-wrap items-center justify-between gap-200">
                <h2 className="text-lg font-semibold text-fg-primary">1. Fakturačné a doručovacie údaje</h2>
                <Badge variant={hasStoredAddress ? "success" : "info"}>
                  {hasStoredAddress ? "Uložené" : "Povinné"}
                </Badge>
              </header>

              <form className="grid gap-300 md:grid-cols-2" onSubmit={handleSaveAddress}>
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
                <Select
                  items={COUNTRY_SELECT_ITEMS}
                  onValueChange={(details) => {
                    updateAddressField(
                      "countryCode",
                      (details.value[0] ?? "SK").toUpperCase(),
                    );
                  }}
                  size="sm"
                  value={[addressForm.countryCode]}
                >
                  <Select.Label>Krajina</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Vyberte krajinu" />
                    </Select.Trigger>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {COUNTRY_SELECT_ITEMS.map((country) => (
                        <Select.Item item={country} key={country.value}>
                          <Select.ItemText />
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select>

                <div className="space-y-200 md:col-span-2">
                  <FormCheckbox
                    checked={createAccountConsent}
                    label="Chcem si vytvoriť účet pre rýchlejší nákup nabudúce."
                    onCheckedChange={setCreateAccountConsent}
                    size="sm"
                  />
                  <FormCheckbox
                    checked={acceptTermsConsent}
                    label="Súhlasím s obchodnými podmienkami."
                    onCheckedChange={setAcceptTermsConsent}
                    required
                    size="sm"
                  />
                </div>

                <div className="flex justify-end md:col-span-2">
                  <Button
                    disabled={isBusy || !cartQuery.cart?.id}
                    isLoading={updateCartAddressMutation.isPending}
                    type="submit"
                    variant="primary"
                  >
                    Uložiť údaje
                  </Button>
                </div>
              </form>
            </section>

            <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
              <header className="flex flex-wrap items-center justify-between gap-200">
                <h2 className="text-lg font-semibold text-fg-primary">2. Doprava</h2>
                <Badge variant={hasShipping ? "success" : "info"}>
                  {hasShipping ? "Zvolená" : "Vyberte dopravu"}
                </Badge>
              </header>
              <div className="grid gap-200">
                {checkoutShippingQuery.shippingOptions.length > 0 ? (
                  checkoutShippingQuery.shippingOptions.map((option) => {
                    const optionPrice = checkoutShippingQuery.shippingPrices[option.id] ?? 0;
                    const isSelected = checkoutShippingQuery.selectedShippingMethodId === option.id;

                    return (
                      <Button
                        className={`w-full rounded-lg border p-300 text-left ${
                          isSelected
                            ? "border-primary bg-highlight"
                            : "border-border-secondary bg-surface-secondary"
                        }`}
                        disabled={isBusy}
                        key={option.id}
                        onClick={() => {
                          void handleSelectShipping(option.id);
                        }}
                        theme="unstyled"
                        type="button"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-300">
                          <div className="flex items-center gap-200">
                            <Icon
                              className={isSelected ? "text-primary" : "text-fg-tertiary"}
                              icon={isSelected ? "token-icon-check" : "token-icon-chevron-right"}
                            />
                            <div className="space-y-50">
                              <p className="text-sm font-semibold text-fg-primary">
                                {option.name ?? option.id}
                              </p>
                              <ExtraText className="text-fg-secondary">
                                {isSelected ? "Zvolená doprava" : "Dostupná možnosť"}
                              </ExtraText>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-fg-primary">
                            {formatCurrencyAmount(optionPrice, currencyCode)}
                          </p>
                        </div>
                      </Button>
                    );
                  })
                ) : (
                  <ExtraText>Nie sú dostupné žiadne možnosti dopravy.</ExtraText>
                )}
              </div>
            </section>

            <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
              <header className="flex flex-wrap items-center justify-between gap-200">
                <h2 className="text-lg font-semibold text-fg-primary">3. Platba</h2>
                <Badge variant={hasPayment ? "success" : "info"}>
                  {hasPayment ? "Inicializovaná" : "Vyberte platbu"}
                </Badge>
              </header>
              <div className="grid gap-200">
                {checkoutPaymentQuery.paymentProviders.length > 0 ? (
                  checkoutPaymentQuery.paymentProviders.map((provider, index) => {
                    const providerId =
                      "id" in provider && typeof provider.id === "string"
                        ? provider.id
                        : "";
                    const providerLabel = resolveProviderLabel(providerId);

                    return (
                      <div
                        className="flex flex-wrap items-center justify-between gap-250 rounded-lg border border-border-secondary bg-surface-secondary p-300"
                        key={providerId || `${providerLabel}-${index}`}
                      >
                        <div className="space-y-50">
                          <p className="text-sm font-semibold text-fg-primary">{providerLabel}</p>
                          <ExtraText className="text-fg-secondary">
                            Platba bude potvrdená po výbere.
                          </ExtraText>
                        </div>
                        <Button
                          disabled={
                            isBusy || !providerId || !checkoutPaymentQuery.canInitiatePayment
                          }
                          isLoading={checkoutPaymentQuery.isInitiatingPayment}
                          onClick={() => {
                            void handleSelectPaymentProvider(providerId);
                          }}
                          theme={hasPayment ? "solid" : "outlined"}
                          type="button"
                          variant={hasPayment ? "primary" : "secondary"}
                        >
                          {hasPayment ? "Zvolená platba" : "Vybrať platbu"}
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <ExtraText>Nie sú dostupné žiadne platobné metódy.</ExtraText>
                )}
              </div>
            </section>

            <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
              <h2 className="text-lg font-semibold text-fg-primary">4. Súhrn a dokončenie</h2>
              <div className="grid gap-200 sm:grid-cols-2">
                <StatusText showIcon size="sm" status={hasStoredAddress ? "success" : "warning"}>
                  {hasStoredAddress ? "Údaje sú uložené." : "Najprv uložte údaje."}
                </StatusText>
                <StatusText showIcon size="sm" status={hasShipping ? "success" : "warning"}>
                  {hasShipping ? "Doprava je vybraná." : "Vyberte dopravu."}
                </StatusText>
                <StatusText showIcon size="sm" status={hasPayment ? "success" : "warning"}>
                  {hasPayment ? "Platba je pripravená." : "Vyberte platbu."}
                </StatusText>
                <StatusText
                  showIcon
                  size="sm"
                  status={acceptTermsConsent ? "success" : "warning"}
                >
                  {acceptTermsConsent
                    ? "Súhlas s podmienkami potvrdený."
                    : "Potvrďte obchodné podmienky."}
                </StatusText>
              </div>
              <Button
                block
                disabled={
                  isBusy ||
                  !checkoutShippingQuery.selectedShippingMethodId ||
                  !checkoutPaymentQuery.hasPaymentSessions ||
                  !acceptTermsConsent
                }
                isLoading={completeCartMutation.isPending}
                onClick={() => {
                  void handleCompleteOrder();
                }}
                type="button"
                variant="primary"
              >
                Dokončiť objednávku
              </Button>
            </section>
          </div>

          <aside className="space-y-300 xl:sticky xl:top-400 xl:self-start">
            <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-400">
              <header className="flex items-center justify-between gap-200">
                <h2 className="text-lg font-semibold text-fg-primary">
                  {`Váš košík (${cartItems.length})`}
                </h2>
                <Badge variant={cartItems.length > 0 ? "success" : "warning"}>
                  {cartItems.length > 0 ? "Aktívny" : "Prázdny"}
                </Badge>
              </header>

              <div className="space-y-250">
                {cartItems.map((item) => {
                  const itemName = resolveCartItemName(item);
                  const itemQuantity = item.quantity ?? 0;
                  const itemPrice = formatCurrencyAmount(resolveLineItemTotalAmount(item), currencyCode);
                  const itemThumbnail =
                    typeof item.thumbnail === "string" && item.thumbnail.length > 0
                      ? item.thumbnail
                      : "/file.svg";

                  return (
                    <article
                      className="flex gap-250 rounded-lg border border-border-secondary bg-surface-secondary p-250"
                      key={item.id}
                    >
                      <Image
                        alt={itemName}
                        className="size-850 shrink-0 rounded-lg border border-border-secondary object-cover"
                        src={itemThumbnail}
                      />
                      <div className="min-w-0 flex-1 space-y-100">
                        <p className="line-clamp-2 text-sm font-semibold text-fg-primary">{itemName}</p>
                        <div className="flex items-center justify-between gap-150">
                          <ExtraText className="text-fg-secondary">{`× ${itemQuantity}`}</ExtraText>
                          <p className="text-sm font-semibold text-fg-primary">{itemPrice}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="space-y-150 border-t border-border-secondary pt-250">
                <div className="flex items-center justify-between gap-200">
                  <ExtraText className="text-fg-secondary">Medzisúčet</ExtraText>
                  <p className="text-sm font-semibold text-fg-primary">
                    {formatCurrencyAmount(cartSubtotalAmount, currencyCode)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-200">
                  <ExtraText className="text-fg-secondary">Doprava</ExtraText>
                  <p className="text-sm font-semibold text-fg-primary">
                    {formatCurrencyAmount(selectedShippingPrice, currencyCode)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-200 border-t border-border-secondary pt-150">
                  <p className="text-sm font-semibold text-fg-primary">Celkom</p>
                  <p className="text-lg font-bold text-fg-primary">
                    {formatCurrencyAmount(resolveCartTotalAmount(cartQuery.cart), currencyCode)}
                  </p>
                </div>
              </div>

              <div className="space-y-150 rounded-lg border border-border-secondary bg-surface-secondary p-250">
                <StatusText showIcon size="sm" status={hasShipping ? "success" : "warning"}>
                  {hasShipping
                    ? `Doprava: ${checkoutShippingQuery.selectedOption?.name ?? "Zvolená"}`
                    : "Doprava: nevybraná"}
                </StatusText>
                <StatusText showIcon size="sm" status={hasPayment ? "success" : "warning"}>
                  {hasPayment ? "Platba: inicializovaná" : "Platba: nevybraná"}
                </StatusText>
              </div>
            </section>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
