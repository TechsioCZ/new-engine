import type { Access } from "payload"

/** Access helper that allows only authenticated users. */
export const requireAuth: Access = ({ req }) => Boolean(req.user)

/** Storefront read access: anonymous readers see only published entries. */
export const publishedOrAuth: Access = ({ req }) =>
  req.user ? true : { status: { equals: "published" } }

/** Storefront read access for supporting content without a publication state. */
export const publicRead: Access = () => true
