"use client";
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
  billingAddressForm: AddressFormState;
  cartId?: string;
  completedOrderId: string | null;
  onCompletedOrderIdChange: (orderId: string | null) => void;
  onOrderCompletionAbort: () => void;
  onOrderCompletionStart: () => void;
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
  shippingAddressForm: AddressFormState;
  useSameAddress: boolean;
};

export function useCheckoutActions({
  billingAddressForm,
  cartId,
  completedOrderId,
  onCompletedOrderIdChange,
  onOrderCompletionAbort,
  onOrderCompletionStart,
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
  shippingAddressForm,
  useSameAddress,
}: UseCheckoutActionsProps) {
  const resetFeedback = () => {
    onCheckoutErrorChange(null);
    if (completedOrderId) {
      onCompletedOrderIdChange(null);
      onOrderCompletionAbort();
    }
  };

  const handleSaveAddress = async () => {
    resetFeedback();

    if (!cartId) {
      onCheckoutErrorChange("Košík nie je pripravený.");
      return false;
    }

    const missingFieldsMessage = buildMissingFieldMessage({
      billingForm: billingAddressForm,
      isCompanyPurchase,
      shippingForm: shippingAddressForm,
      useSameAddress,
    });
    if (missingFieldsMessage) {
      onCheckoutErrorChange(missingFieldsMessage);
      return false;
    }

    const normalizedShippingAddress = buildHerbatikaCheckoutAddressInput(
      shippingAddressForm,
    );
    const normalizedBillingAddress = useSameAddress
      ? normalizedShippingAddress
      : buildHerbatikaCheckoutAddressInput(billingAddressForm);

    try {
      await saveAddress({
        cartId,
        email: shippingAddressForm.email.trim(),
        shippingAddress: normalizedShippingAddress,
        billingAddress: normalizedBillingAddress,
        useSameAddress,
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

    onOrderCompletionStart();

    try {
      const completeResult = await completeCart();

      const orderId = resolveOrderId(completeResult);
      if (orderId) {
        onCompletedOrderIdChange(orderId);
        return;
      }

      const completionFailureMessage =
        resolveCompleteCartFailure(completeResult);
      if (completionFailureMessage) {
        onOrderCompletionAbort();
        onCheckoutErrorChange(completionFailureMessage);
        return;
      }

      onOrderCompletionAbort();
      onCheckoutErrorChange("Dokončenie objednávky zlyhalo.");
    } catch (error) {
      onOrderCompletionAbort();
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
