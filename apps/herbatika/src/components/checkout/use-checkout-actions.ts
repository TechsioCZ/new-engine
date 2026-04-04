"use client";

import { useState } from "react";
import { buildHerbatikaCheckoutAddressInput } from "@/lib/storefront/cart/address-adapter";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import type { AddressFormState } from "./checkout.constants";
import { buildMissingFieldMessage } from "./checkout-address.utils";
import {
  resolveCompleteCartFailure,
  resolveOrderId,
} from "./checkout-completion.utils";

type AddressMutationInput = {
  billingAddress: ReturnType<typeof buildHerbatikaCheckoutAddressInput>;
  cartId: string;
  email: string;
  shippingAddress: ReturnType<typeof buildHerbatikaCheckoutAddressInput>;
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
  completeCart: () => Promise<unknown>;
  initiatePayment: (providerId: string) => Promise<unknown>;
  onCheckoutErrorChange: (message: string | null) => void;
  saveAddress: (input: AddressMutationInput) => Promise<unknown>;
  setShippingMethod: (optionId: string) => void;
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
  onCheckoutErrorChange,
  saveAddress,
  selectedShippingMethodId,
  setShippingMethod,
}: UseCheckoutActionsProps) {
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  const resetFeedback = () => {
    onCheckoutErrorChange(null);
    setCompletedOrderId(null);
  };

  const handleSaveAddress = async () => {
    resetFeedback();

    if (!cartId) {
      onCheckoutErrorChange("Košík nie je pripravený.");
      return false;
    }

    const missingFieldsMessage = buildMissingFieldMessage(
      addressForm,
      isCompanyPurchase,
    );
    if (missingFieldsMessage) {
      onCheckoutErrorChange(missingFieldsMessage);
      return false;
    }

    const normalizedAddress = buildHerbatikaCheckoutAddressInput(addressForm);

    try {
      await saveAddress({
        cartId,
        email: addressForm.email.trim(),
        shippingAddress: normalizedAddress,
        billingAddress: normalizedAddress,
        useSameAddress: true,
      });
      return true;
    } catch (error) {
      onCheckoutErrorChange(resolveErrorMessage(error, "Uloženie adresy zlyhalo."));
      return false;
    }
  };

  const handleSelectShipping = (optionId: string) => {
    resetFeedback();

    try {
      setShippingMethod(optionId);
    } catch (error) {
      onCheckoutErrorChange(
        resolveErrorMessage(error, "Nastavenie dopravy zlyhalo."),
      );
    }
  };

  const handleSelectPaymentProvider = async (providerId: string) => {
    resetFeedback();

    if (!canInitiatePayment) {
      onCheckoutErrorChange("Najprv vyberte dopravu.");
      return;
    }

    try {
      await initiatePayment(providerId);
    } catch (error) {
      onCheckoutErrorChange(
        resolveErrorMessage(error, "Nastavenie platby zlyhalo."),
      );
    }
  };

  const handleCompleteOrder = async () => {
    resetFeedback();

    if (!cartId) {
      onCheckoutErrorChange("Košík nie je pripravený.");
      return;
    }

    if (itemCount < 1) {
      onCheckoutErrorChange("Košík je prázdny. Pridajte najprv produkty.");
      return;
    }

    if (!selectedShippingMethodId) {
      onCheckoutErrorChange("Vyberte dopravu pred dokončením objednávky.");
      return;
    }

    if (!hasPaymentSessions) {
      onCheckoutErrorChange("Vyberte platobnú metódu pred dokončením objednávky.");
      return;
    }

    try {
      const completeResult = await completeCart();

      const orderId = resolveOrderId(completeResult);
      if (orderId) {
        setCompletedOrderId(orderId);
        return;
      }

      const completionFailureMessage =
        resolveCompleteCartFailure(completeResult);
      if (completionFailureMessage) {
        onCheckoutErrorChange(completionFailureMessage);
        return;
      }

      onCheckoutErrorChange("Dokončenie objednávky zlyhalo.");
    } catch (error) {
      onCheckoutErrorChange(
        resolveErrorMessage(error, "Dokončenie objednávky zlyhalo."),
      );
    }
  };

  return {
    completedOrderId,
    handleCompleteOrder,
    handleSaveAddress,
    handleSelectPaymentProvider,
    handleSelectShipping,
    resetFeedback,
  };
}
