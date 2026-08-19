import "server-only"
import { revalidateTag } from "next/cache"
import { createUrlRegistryInvalidationConsumer } from "./invalidation-consumer"

const consumer = createUrlRegistryInvalidationConsumer({ revalidateTag })

export const consumeUrlRegistryInvalidation = consumer.consume
