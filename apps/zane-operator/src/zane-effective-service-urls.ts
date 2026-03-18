import type { ZaneServiceDetails, ZaneServiceUrl } from "./zane-contract"

function coercePendingUrl(
  value: Record<string, unknown> | null | undefined
): ZaneServiceUrl | null {
  if (!value || typeof value.domain !== "string") {
    return null
  }

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    domain: value.domain,
    base_path:
      typeof value.base_path === "string" && value.base_path.trim()
        ? value.base_path
        : "/",
    strip_prefix:
      typeof value.strip_prefix === "boolean" ? value.strip_prefix : true,
    redirect_to: typeof value.redirect_to === "string" ? value.redirect_to : null,
    associated_port:
      typeof value.associated_port === "number" ? value.associated_port : null,
  }
}

export function computeEffectiveUrls(
  serviceDetails: Pick<ZaneServiceDetails, "urls" | "unapplied_changes">
): ZaneServiceUrl[] {
  const urls = [...(serviceDetails.urls ?? [])]

  for (const change of serviceDetails.unapplied_changes ?? []) {
    if (change.field !== "urls" || typeof change.type !== "string") {
      continue
    }

    if (change.type === "DELETE" && change.item_id) {
      const index = urls.findIndex((url) => url.id === change.item_id)
      if (index >= 0) {
        urls.splice(index, 1)
      }
      continue
    }

    const pendingUrl = coercePendingUrl(change.new_value)
    if (!pendingUrl) {
      continue
    }

    if (change.type === "UPDATE" && change.item_id) {
      const index = urls.findIndex((url) => url.id === change.item_id)
      if (index >= 0) {
        urls[index] = {
          ...urls[index],
          ...pendingUrl,
          id: change.item_id,
        }
      } else {
        urls.push({
          ...pendingUrl,
          id: change.item_id,
        })
      }
      continue
    }

    if (change.type === "ADD") {
      urls.push(pendingUrl)
    }
  }

  return urls
}

export function buildServicePublicUrls(
  serviceDetails: Pick<ZaneServiceDetails, "urls" | "unapplied_changes">
): string[] {
  return computeEffectiveUrls(serviceDetails)
    .map((url) => {
      const basePath =
        typeof url.base_path === "string" && url.base_path.trim()
          ? url.base_path.trim()
          : "/"
      return new URL(
        basePath.startsWith("/") ? basePath : `/${basePath}`,
        `https://${url.domain}`
      ).toString()
    })
    .filter((value, index, array) => array.indexOf(value) === index)
}
