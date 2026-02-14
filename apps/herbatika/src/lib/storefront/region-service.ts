import { createMedusaRegionService } from "@techsio/storefront-data";
import { storefrontSdk } from "./sdk";

export const regionService = createMedusaRegionService(storefrontSdk);
