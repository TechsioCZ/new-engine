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
    hooks: {
      invalidateOnAuthChange: {
        includeDefaults: true,
        invalidate: [storefrontCoreDefinition.queryKeys.cart.all()],
        removeOnLogout: [storefrontCoreDefinition.queryKeys.cart.all()],
      },
    },
    service: authService,
  },
  cart: {
    hooks: {
      addressAdapter: herbatikaCheckoutCartAddressAdapter,
      buildAddParams: buildAddLineItemParams,
      buildCreateInputFromAddInput: buildCreateCartInputFromAddLineItemInput,
      buildCreateParams: buildCreateCartParams,
      buildUpdateParams: buildUpdateCartParams,
      cartStorage,
      requireRegion: true,
    },
    serviceConfig: storefrontCartServiceConfig,
  },
} as const
