import type { Access } from 'payload'

/** Access helper that allows only authenticated users. */
export const requireAuth: Access = ({ req }) => Boolean(req.user)
