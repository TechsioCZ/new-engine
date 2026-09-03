/**
 * Seed-database handover: reset (or create) a Payload admin password.
 *
 * Run this AFTER sanitize.sql has cleared payload.users.hash/salt on your
 * restored target database. It uses Payload's own Local API to set the
 * password, so hashing/salting is handled by Payload itself -- this script
 * never implements or touches crypto directly.
 *
 * Usage (from apps/payload, with DATABASE_URL pointed at your target DB):
 *   pnpm --dir apps/payload payload run \
 *     ../../scripts/seed-handover/reset-payload-admin.ts -- \
 *     --email admin@example.com --password 'a-strong-new-password'
 *
 * If no user with that email exists yet, one is created. If a user with
 * that email already exists (e.g. the restored demo admin@example.com row
 * sanitize.sql cleared), its password is updated in place.
 */

import { getPayload } from "payload"
import config from "../../apps/payload/src/payload.config"

function parseArgs(argv: string[]): { email?: string; password?: string } {
  const out: { email?: string; password?: string } = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--email") {
      out.email = argv[++i]
    } else if (arg === "--password") {
      out.password = argv[++i]
    }
  }
  return out
}

async function main() {
  const { email, password } = parseArgs(process.argv.slice(2))
  if (!(email && password)) {
    console.error(
      "Usage: reset-payload-admin.ts --email <email> --password <new-password>"
    )
    process.exit(1)
  }
  if (password.length < 12) {
    console.error("Refusing a password shorter than 12 characters.")
    process.exit(1)
  }

  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    const id = existing.docs[0].id
    await payload.update({
      collection: "users",
      id,
      data: { password },
    })
    console.log(`Updated password for existing Payload user: ${email}`)
  } else {
    await payload.create({
      collection: "users",
      data: { email, password },
    })
    console.log(`Created new Payload admin user: ${email}`)
  }

  process.exit(0)
}

main().catch((error) => {
  console.error("reset-payload-admin failed:", error)
  process.exit(1)
})
