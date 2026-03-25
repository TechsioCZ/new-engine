import { authService } from "./auth/service";
import {
  buildAddLineItemParams,
  buildCreateCartParams,
  buildUpdateCartParams,
} from "./cart/params";
import { cartStorage } from "./cart-storage";
import { storefrontCoreDefinition } from "./storefront-core-definition";

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
    hooks: {
      cartStorage,
      requireRegion: true,
      buildCreateParams: buildCreateCartParams,
      buildUpdateParams: buildUpdateCartParams,
      buildAddParams: buildAddLineItemParams,
    },
  },
} as const;
