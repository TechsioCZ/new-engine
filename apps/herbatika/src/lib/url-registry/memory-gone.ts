import type {
  GoneMutationResult,
  RegisterGoneRequest,
  UrlRegistryCommand,
} from "./commands"
import type { MemoryCommandExecutor } from "./memory-command"
import { assertSlugAvailable } from "./memory-constraints"
import { assertCreateVersion, assertSlugInput } from "./memory-input"
import { asGoneMutation } from "./memory-result"
import { cloneValue } from "./memory-state"
import { sortedUnique } from "./memory-support"
import {
  assertEntityKind,
  assertMarket,
  assertSource,
} from "./memory-validation"
import type { UrlEntitySlug } from "./model"

export const registerGone = (
  executor: MemoryCommandExecutor,
  command: UrlRegistryCommand<RegisterGoneRequest>
): GoneMutationResult => {
  const replay = executor.prepare(command, "register-gone")
  if (replay) {
    return asGoneMutation(replay)
  }
  const { request } = command
  assertCreateVersion(request.expectedVersion)
  assertSource(request.source)
  assertMarket(request.slug.market)
  assertEntityKind(request.slug.kind)
  assertSlugInput(request.slug)
  const next = executor.transactionState()
  assertSlugAvailable(next, request.slug)

  const now = executor.timestamp()
  const slug: UrlEntitySlug = {
    id: executor.newId(next, "slug"),
    ...request.slug,
    routeId: null,
    disposition: "gone",
    createdAt: now,
  }
  next.slugs.set(slug.id, slug)
  const commit = executor.commit(next, command, {
    outcome: "applied",
    routeId: null,
    affectedRouteIds: [],
    previousVersion: null,
    resultVersion: null,
    details: {
      market: slug.market,
      kind: slug.kind,
      normalizedSlug: slug.normalizedSlug,
    },
    tags: sortedUnique([
      `market:${slug.market}`,
      `route-family:${slug.market}:${slug.kind}`,
      `route-slug:${slug.market}:${slug.kind}:${slug.normalizedSlug}`,
      `sitemap:${slug.market}`,
    ]),
    createdAt: now,
  })
  return executor.finish(next, command, {
    slug: cloneValue(slug),
    commit,
  })
}
