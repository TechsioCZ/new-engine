import { getPayload } from "payload"
import config from "../payload.config"

/**
 * One-off: drain the "cms-outbox" job queue so the pending
 * deliver-medusa-cms-invalidation job (queued by the pages afterChange hook)
 * is delivered immediately instead of waiting for the disabled cron.
 */
const run = async () => {
  const payload = await getPayload({ config })

  try {
    const result = await payload.jobs.run({ queue: "cms-outbox", limit: 50 })
    payload.logger.info(`cms-outbox drain result: ${JSON.stringify(result)}`)
  } finally {
    await payload.destroy()
  }
}

await run()
