import type {
  MedusaAuthCredentials,
  MedusaRegisterData,
  MedusaUpdateCustomerData,
} from "@techsio/storefront-data";

export type AuthLoginInput = MedusaAuthCredentials;
export type AuthRegisterInput = MedusaRegisterData;
export type AuthUpdateInput = MedusaUpdateCustomerData;

export type AuthProxyResponse = {
  token: string;
};
