import type { HttpTypes } from "@medusajs/types";
import type { ProductSectionDefinition } from "./homepage.data";

export type HomepageProductSection = ProductSectionDefinition & {
  products: HttpTypes.StoreProduct[];
};
