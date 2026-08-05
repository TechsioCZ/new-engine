import type { SQL } from "drizzle-orm"
import { sql } from "drizzle-orm"

/** Category result from database query */
export interface CategoryRaw {
  title: string
  description: string
  handle: string
  isActive: boolean
  parentHandle: string | undefined
}

/** SQL query to fetch categories from legacy database */
export const categoriesSql: SQL<CategoryRaw> = sql`
  SELECT
    cl.title,
    cl.description,
    cl.rewrite_title AS handle,
    c.visible AS isActive,
    cparentl.rewrite_title AS parentHandle
  FROM category c
  JOIN category_lang cl ON cl.id_category = c.id
  JOIN lang l ON l.id = cl.id_lang
  LEFT JOIN category cparent ON cparent.id = c.id_parent
  LEFT JOIN category_lang cparentl
    ON cparentl.id_lang IN (SELECT ll.id FROM lang ll WHERE ll.abbreviation = 'cz')
    AND cparentl.id_category = cparent.id
  WHERE l.abbreviation = 'cz'
    AND l.active = 1
`
