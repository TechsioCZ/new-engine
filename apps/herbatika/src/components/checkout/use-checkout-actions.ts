"use client";

import { useState } from "react";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import type { AddressFormState } from "./checkout.constants";
import {
  buildMissingFieldMessage,
  resolveCompleteCartFailure,
  resolveOrderId,
} from "./checkout.utils";

type AddressMutationInput = {
  billingAddress: {
    address_1: string;
    address_2?: string;
    city: string;
    company?: string;
    country_code: string;
    first_name: string;
    last_name: string;
    phone?: string;
    postal_code: string;
  };
  cartId: string;
  email: string;
  shippingAddress: {
    address_1: string;
    address_2?: string;
    city: string;
    company?: string;
    country_code: string;
    first_name: string;
    last_name: string;
    phone?: string;
    postal_code: string;
  };
  useSameAddress: boolean;
};

type UseCheckoutActionsProps = {
  addressForm: AddressFormState;
  cartId?: string;
  isCompanyPurchase: boolean;
  hasPaymentSessions: boolean;
  itemCount: number;
  canInitiatePayment: boolean;
  selectedShippingMethodId?: string | null;
  completeCart: (input: { cartId: string }) => Promise<unknown>;
  initiatePayment: (providerId: string) => Promise<unknown>;
  saveAddress: (input: AddressMutationInput) => Promise<unknown>;
  setShippingMethod: (optionId: string) => Promise<unknown>;
};

export function useCheckoutActions({
  addressForm,
  cartId,
  isCompanyPurchase,
  canInitiatePayment,
  completeCart,
  hasPaymentSessions,
  initiatePayment,
  itemCount,
  saveAddress,
  selectedShippingMethodId,
  setShippingMethod,
}: UseCheckoutActionsProps) {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  const resetFeedback = () => {
    setCheckoutError(null);
    setCheckoutMessage(null);
    setCompletedOrderId(null);
  };

  const handleSaveAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!cartId) {
      setCheckoutError("Košík není připraven.");
      return;
    }

    const missingFieldsMessage = buildMissingFieldMessage(
      addressForm,
      isCompanyPurchase,
    );
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
      await saveAddress({
        cartId,
        email: addressForm.email.trim(),
        shippingAddress: normalizedAddress,
        billingAddress: normalizedAddress,
        useSameAddress: true,
      });
      setCheckoutMessage("Adresa bola uložená.");
    } catch (error) {
      setCheckoutError(resolveErrorMessage(error, "Uloženie adresy zlyhalo."));
    }
  };

  const handleSelectShipping = async (optionId: string) => {
    resetFeedback();

    try {
      await setShippingMethod(optionId);
      setCheckoutMessage("Doprava bola vybraná.");
    } catch (error) {
      setCheckoutError(resolveErrorMessage(error, "Nastavenie dopravy zlyhalo."));
    }
  };

  const handleSelectPaymentProvider = async (providerId: string) => {
    resetFeedback();

    if (!canInitiatePayment) {
      setCheckoutError("Najprv vyberte dopravu.");
      return;
    }

    try {
      await initiatePayment(providerId);
      setCheckoutMessage("Platba bola inicializovaná.");
    } catch (error) {
      setCheckoutError(resolveErrorMessage(error, "Nastavenie platby zlyhalo."));
    }
  };

  const handleCompleteOrder = async () => {
    resetFeedback();

    if (!cartId) {
      setCheckoutError("Košík není připraven.");
      return;
    }

    if (itemCount < 1) {
      setCheckoutError("Košík je prázdny. Pridajte najprv produkty.");
      return;
    }

    if (!selectedShippingMethodId) {
      setCheckoutError("Vyberte dopravu pred dokončením objednávky.");
      return;
    }

    if (!hasPaymentSessions) {
      setCheckoutError("Vyberte platobnú metódu pred dokončením objednávky.");
      return;
    }

    try {
      const completeResult = await completeCart({ cartId });

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
      setCheckoutError(resolveErrorMessage(error, "Dokončenie objednávky zlyhalo."));
    }
  };

  return {
    checkoutError,
    checkoutMessage,
    completedOrderId,
    handleCompleteOrder,
    handleSaveAddress,
    handleSelectPaymentProvider,
    handleSelectShipping,
    resetFeedback,
  };
}
