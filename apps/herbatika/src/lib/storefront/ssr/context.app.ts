import { cache } from "react"
import { assertServerOnly } from "@/lib/server-guard"
import { getAppRequestServerContext } from "../market-context.app"
import { getRegionServerContext } from "./context"

assertServerOnly("storefront/ssr/context.app")

export const getAppRegionServerContext = cache(async () =>
  getRegionServerContext(await getAppRequestServerContext())
)
