import { authService } from "./auth/service";
import {
  buildAddLineItemParams,
  buildCreateCartParams,
  buildUpdateCartParams,
} from "./cart/params";
import { cartStorage } from "./cart-storage";
import {
  storefrontQueryKeys,
} from "./storefront-config";
import { storefrontCoreDefinition } from "./storefront-core-definition";

export const storefrontDefinition = {
  ...storefrontCoreDefinition,
  auth: {
    service: authService,
    hooks: {
      invalidateOnAuthChange: {
        includeDefaults: true,
        invalidate: [storefrontQueryKeys.cart.all()],
        removeOnLogout: [storefrontQueryKeys.cart.all()],
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
