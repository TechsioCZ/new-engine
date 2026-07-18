import { logCheckoutAccountSetupDebug } from "./checkout-account-setup-debug"

type CreateCheckoutCompletionHandlerInput = {
  completeOrder: () => Promise<void>
  syncAccountSetupPreference: () => Promise<boolean>
}

export const createCheckoutCompletionHandler =
  ({
    completeOrder,
    syncAccountSetupPreference,
  }: CreateCheckoutCompletionHandlerInput) =>
  async () => {
    const didSyncAccountSetup = await syncAccountSetupPreference()

    logCheckoutAccountSetupDebug("handle complete order sync verdict", {
      did_sync_account_setup: didSyncAccountSetup,
    })

    if (didSyncAccountSetup) {
      await completeOrder()
    }
  }
