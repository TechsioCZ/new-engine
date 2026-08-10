// Typed façade for ./migrations, used only by the strict typecheck wrapper via
// moduleSuffixes. Committed migration implementations are immutable generated
// history and are excluded from the strict program; this declaration keeps
// payload.config.ts fully checked against the real module shape.
import type { MigrateDownArgs, MigrateUpArgs } from "@payloadcms/db-postgres"

export declare const migrations: {
  up: (args: MigrateUpArgs) => Promise<void>
  down: (args: MigrateDownArgs) => Promise<void>
  name: string
}[]
