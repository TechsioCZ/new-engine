/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */

import config from "@payload-config"
import { generatePageMetadata, RootPage } from "@payloadcms/next/views"
import type { Metadata } from "next"
import { importMap } from "../importMap"

interface Args {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata =  async ({
  params,
  searchParams,
}: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

const Page =  async ({ params, searchParams }: Args) =>
  RootPage({ config, importMap, params, searchParams })

export default Page
