import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { expect, test } from "vitest"

import { listLocalRuntimeProviderOutputAliases } from "../contracts/stack-inputs.js"
import { loadDeployContracts } from "../orchestration/deploy-inputs.js"
import { executeLocalEnvRuntimeProviderOutputTargets } from "../orchestration/local-env.js"

const repoRoot = resolve(import.meta.dirname, "../../../..")
const stackManifestPath = join(
  repoRoot,
  "apps/new-engine-ctl/config/stack-manifest.yaml",
)
const stackInputsPath = join(
  repoRoot,
  "apps/new-engine-ctl/config/stack-inputs.yaml",
)

test("local provider aliases include only selected configured consumers", async () => {
  const result = await executeLocalEnvRuntimeProviderOutputTargets({
    format: "json",
    outputId: "frontend_key",
    providerId: "meili_api_credentials",
    serviceIdsCsv: "herbatika,n1",
    stackInputsPath,
  })

  expect(result.targets).toStrictEqual([
    {
      env_var: "NEXT_PUBLIC_MEILISEARCH_API_KEY",
      local_env_var: "DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY",
      service_id: "n1",
    },
  ])
})

test("local provider aliases are empty for selected non-consumers", async () => {
  const result = await executeLocalEnvRuntimeProviderOutputTargets({
    format: "json",
    outputId: "frontend_key",
    providerId: "meili_api_credentials",
    serviceIdsCsv: "herbatika",
    stackInputsPath,
  })

  expect(result.targets).toStrictEqual([])
})

test("local provider aliases still reject missing aliases for real consumers", async () => {
  const { stackInputs } = await loadDeployContracts(
    stackManifestPath,
    stackInputsPath,
  )
  stackInputs.local_env_aliases.runtime_provider_outputs =
    stackInputs.local_env_aliases.runtime_provider_outputs.filter(
      (alias) =>
        !(
          alias.provider_id === "meili_api_credentials" &&
          alias.output_id === "frontend_key" &&
          alias.service_id === "n1"
        ),
    )

  expect(() =>
    listLocalRuntimeProviderOutputAliases(
      stackInputs,
      "meili_api_credentials",
      "frontend_key",
      ["n1"],
    ),
  ).toThrow(
    "Missing local env alias for meili_api_credentials.frontend_key consumer service(s): n1.",
  )
})
