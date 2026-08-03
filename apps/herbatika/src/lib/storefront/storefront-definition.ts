import { authService } from "./auth/service"
import { cartStorage } from "./cart-storage"
import { herbatikaCheckoutCartAddressAdapter } from "./cart/address-adapter"
import {
  buildAddLineItemParams,
  buildCreateCartInputFromAddLineItemInput,
  buildCreateCartParams,
  buildUpdateCartParams,
} from "./cart/params"
import { storefrontCartServiceConfig } from "./storefront-config"
import { storefrontCoreDefinition } from "./storefront-core-definition"

export const storefrontDefinition = {
  ...storefrontCoreDefinition,
  auth: {
    service: authService,
    hooks: {
      invalidateOnAuthChange: {
        includeDefaults: true,
        invalidate: [storefrontCoreDefinition.queryKeys.cart.all()],
        removeOnLogout: [storefrontCoreDefinition.queryKeys.cart.all()],
      },
    },
  },
  cart: {
    serviceConfig: storefrontCartServiceConfig,
    hooks: {
      addressAdapter: herbatikaCheckoutCartAddressAdapter,
      cartStorage,
      requireRegion: true,
      buildCreateParams: buildCreateCartParams,
      buildCreateInputFromAddInput: buildCreateCartInputFromAddLineItemInput,
      buildUpdateParams: buildUpdateCartParams,
      buildAddParams: buildAddLineItemParams,
    },
  },
} as const
