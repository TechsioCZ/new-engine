import { describe } from "vitest"
import { runEntityBehavior } from "./behavior-entity"
import type { HarnessFactory, Suite } from "./behavior-helpers"
import { runIdempotencyBehavior } from "./behavior-idempotency"
import { runLifecycleBehavior } from "./behavior-lifecycle"
import { runMetadataBehavior } from "./behavior-metadata"
import { runProjectionSafetyBehavior } from "./behavior-projection-safety"
import { runReadBehavior } from "./behavior-reads"
import { runStaticBehavior } from "./behavior-static"

export type { RegistryBehaviorHarness } from "./behavior-helpers"

export const runUrlRegistryBehaviorSuite = (
  name: string,
  createHarness: HarnessFactory,
  suite: Suite = describe
) => {
  suite(name, () => {
    runEntityBehavior(createHarness)
    runLifecycleBehavior(createHarness)
    runMetadataBehavior(createHarness)
    runReadBehavior(createHarness)
    runStaticBehavior(createHarness)
    runProjectionSafetyBehavior(createHarness)
    runIdempotencyBehavior(createHarness)
  })
}
