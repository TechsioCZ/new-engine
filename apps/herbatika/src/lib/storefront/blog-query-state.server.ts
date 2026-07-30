import "server-only"

import { createLoader } from "nuqs/server"
import { blogQueryParsers } from "./blog-query-state"

export const loadBlogQueryState = createLoader(blogQueryParsers)
