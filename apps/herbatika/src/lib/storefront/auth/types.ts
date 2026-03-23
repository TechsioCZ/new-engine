import type {
  MedusaAuthCredentials,
  MedusaRegisterData,
  MedusaUpdateCustomerData,
} from "@techsio/storefront-data/auth/medusa-service";

export type AuthLoginInput = MedusaAuthCredentials;
export type AuthRegisterInput = MedusaRegisterData;
export type AuthUpdateInput = MedusaUpdateCustomerData;

export type AuthProxyResponse = {
  token: string;
};
