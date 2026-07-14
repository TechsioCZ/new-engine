import type { StorefrontTextRecord } from "./models/storefront-text"

type StorefrontTextValueSource = Pick<
  StorefrontTextRecord,
  "default_value" | "override_value" | "status"
>

export const getEffectiveStorefrontTextValue = ({
  default_value: defaultValue,
  override_value: overrideValue,
  status,
}: StorefrontTextValueSource) =>
  status === "active" && overrideValue !== null ? overrideValue : defaultValue
