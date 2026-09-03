import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "vitest"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")
const bootstrapPath = join(
  repoRoot,
  "docker/development/postgres/postgres-role-bootstrap.sh"
)
const directAclPattern = /acl\.grantee = app_user_oid/g
const grantCreatePattern = /GRANT\s+CREATE/i
const grantObjectPrivilegePattern =
  /GRANT\s+[^\n]+\s+ON\s+(TABLE|SEQUENCE|ROUTINE|TYPE)/i

async function loadAppSchemaRevocationBlock() {
  const source = await readFile(bootstrapPath, "utf8")
  const start = source.indexOf(
    "  FOR schema_record IN\n",
    source.indexOf("app_user_oid oid;")
  )
  const end = source.indexOf(
    "\n\n  EXECUTE format('ALTER SCHEMA %I OWNER TO %I', app_schema, app_user);",
    start
  )

  if (start === -1 || end <= start) {
    throw new Error("App schema revocation block was not found")
  }

  return source.slice(start, end)
}

test("preserves schema usage when the app role has direct object ACLs", async () => {
  const block = await loadAppSchemaRevocationBlock()

  expect(block).toContain("SELECT oid, nspname")
  expect(block).toContain("aclexplode(c.relacl)")
  expect(block).toContain("aclexplode(p.proacl)")
  expect(block).toContain("aclexplode(t.typacl)")
  expect(block.match(directAclPattern)).toHaveLength(3)
  expect(block).toContain(
    "GRANT USAGE ON SCHEMA %I TO %I', schema_record.nspname, app_user"
  )
})

test("revokes unrelated schemas without broadening object or create privileges", async () => {
  const block = await loadAppSchemaRevocationBlock()
  const revokePosition = block.indexOf("REVOKE ALL ON SCHEMA")
  const usagePosition = block.indexOf("GRANT USAGE ON SCHEMA")

  expect(revokePosition).toBeGreaterThan(-1)
  expect(usagePosition).toBeGreaterThan(revokePosition)
  expect(block).not.toMatch(grantCreatePattern)
  expect(block).not.toMatch(grantObjectPrivilegePattern)
})
