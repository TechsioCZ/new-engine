"use client";

import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import {
  resolveCompleteCartFailure,
  resolveOrderId,
} from "./checkout-completion.utils";

type UseCheckoutActionsProps = {
  cartId?: string;
  completedOrderId: string | null;
  onCompletedOrderIdChange: (orderId: string | null) => void;
  onOrderCompletionAbort: () => void;
  onOrderCompletionStart: () => void;
  hasPaymentSessions: boolean;
  itemCount: number;
  canInitiatePayment: boolean;
  selectedShippingMethodId?: string | null;
  completeCart: () => Promise<unknown>;
  initiatePayment: (providerId: string) => Promise<unknown>;
  onCheckoutErrorChange: (message: string | null) => void;
  setShippingMethod: (optionId: string, data?: Record<string, unknown>) => void;
};

export function useCheckoutActions({
  cartId,
  canInitiatePayment,
  completedOrderId,
  completeCart,
  hasPaymentSessions,
  initiatePayment,
  itemCount,
  onCheckoutErrorChange,
  onCompletedOrderIdChange,
  onOrderCompletionAbort,
  onOrderCompletionStart,
  selectedShippingMethodId,
  setShippingMethod,
}: UseCheckoutActionsProps) {
  const resetFeedback = () => {
    onCheckoutErrorChange(null);
    if (completedOrderId) {
      onCompletedOrderIdChange(null);
      onOrderCompletionAbort();
    }
  };

  const handleSelectShipping = (
    optionId: string,
    data?: Record<string, unknown>,
  ) => {
    resetFeedback();

    try {
      setShippingMethod(optionId, data);
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
    handleSelectPaymentProvider,
    handleSelectShipping,
    resetFeedback,
  };
}
