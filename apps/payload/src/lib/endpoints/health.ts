import type { Endpoint } from 'payload'
import { buildJsonResponse } from '../utils/endpoint'

/** Simple health check endpoint for container probes. */
export const healthEndpoint: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (req) => buildJsonResponse(req, { status: 'ok' }),
}
