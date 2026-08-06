import { randomUUID } from "node:crypto"
import { runUrlRegistryBehaviorSuite } from "./behavior-contract"
import { InMemoryUrlRegistry } from "./memory"

runUrlRegistryBehaviorSuite("memory registry behavior contract", () => {
  const key = randomUUID()
  return Promise.resolve({
    registry: new InMemoryUrlRegistry(),
    entityId: `behavior-${key}`,
    slugPrefix: `behavior-${key}`,
    cleanup: () => Promise.resolve(),
  })
})
