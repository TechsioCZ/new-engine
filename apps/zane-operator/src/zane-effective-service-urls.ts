import type { ZaneServiceDetails, ZaneServiceUrl } from "./zane-contract"

const coercePendingUrl = (
  value: Record<string, unknown> | null | undefined,
): ZaneServiceUrl | null => {
  if (
    value === null ||
    value === undefined ||
    typeof value["domain"] !== "string"
  ) {
    return null
  }

  const associatedPort = value["associated_port"]
  const basePath = value["base_path"]
  const { id } = value
  const redirectTo = value["redirect_to"]
  const stripPrefix = value["strip_prefix"]

  return {
    ...(typeof id === "string" ? { id } : {}),
    associated_port: typeof associatedPort === "number" ? associatedPort : null,
    base_path:
      typeof basePath === "string" && basePath.trim() !== "" ? basePath : "/",
    domain: value["domain"],
    redirect_to: typeof redirectTo === "string" ? redirectTo : null,
    strip_prefix: typeof stripPrefix === "boolean" ? stripPrefix : true,
  }
}

const applyPendingUrlChange = (
  urls: ZaneServiceUrl[],
  change: NonNullable<ZaneServiceDetails["unapplied_changes"]>[number],
): void => {
  if (change.field !== "urls" || typeof change.type !== "string") {
    return
  }

  const itemId = change.item_id
  if (
    change.type === "DELETE" &&
    itemId !== undefined &&
    itemId !== null &&
    itemId !== ""
  ) {
    const index = urls.findIndex((url) => url.id === itemId)
    if (index !== -1) {
      urls.splice(index, 1)
    }
    return
  }

  const pendingUrl = coercePendingUrl(change.new_value)
  if (pendingUrl === null) {
    return
  }

  if (
    change.type === "UPDATE" &&
    itemId !== undefined &&
    itemId !== null &&
    itemId !== ""
  ) {
    const index = urls.findIndex((url) => url.id === itemId)
    const nextUrl = {
      ...(index === -1 ? {} : urls[index]),
      ...pendingUrl,
      id: itemId,
    }
    if (index === -1) {
      urls.push(nextUrl)
    } else {
      urls[index] = nextUrl
    }
    return
  }

  if (change.type === "ADD") {
    urls.push(pendingUrl)
  }
}

export const computeEffectiveUrls = (
  serviceDetails: Pick<ZaneServiceDetails, "urls" | "unapplied_changes">,
): ZaneServiceUrl[] => {
  const urls = [...serviceDetails.urls]

  for (const change of serviceDetails.unapplied_changes ?? []) {
    applyPendingUrlChange(urls, change)
  }

  return urls
}

export const buildServicePublicUrls = (
  serviceDetails: Pick<ZaneServiceDetails, "urls" | "unapplied_changes">,
): string[] => {
  const publicUrls: string[] = []
  const seenUrls = new Set<string>()

  for (const url of computeEffectiveUrls(serviceDetails)) {
    const basePath = url.base_path.trim() === "" ? "/" : url.base_path.trim()
    const publicUrl = new URL(
      basePath.startsWith("/") ? basePath : `/${basePath}`,
      `https://${url.domain}`,
    ).toString()
    if (!seenUrls.has(publicUrl)) {
      seenUrls.add(publicUrl)
      publicUrls.push(publicUrl)
    }
  }

  return publicUrls
}
