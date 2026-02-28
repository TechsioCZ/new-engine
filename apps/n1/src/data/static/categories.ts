// Auto-generated file - DO NOT EDIT
// Generated at: 2026-02-24T21:49:56.876Z
// Run 'pnpm run generate:categories' to regenerate
// This version filters out categories without products and adds root_category_id

import type { Category, CategoryTreeNode } from "@/data/static/type"

export type LeafCategory = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
  root_category_id: string | null // NEW: ID of root category
}

export type LeafParent = {
  id: string
  name: string
  handle: string
  children: string[] // Array of direct child category IDs
  leafs: string[] // Array of ALL nested leaf category IDs
}

export type FilteringStats = {
  totalCategoriesBeforeFiltering: number
  totalCategoriesAfterFiltering: number
  categoriesWithDirectProducts: number
  filteredOutCount: number
}

export type StaticCategoryData = {
  allCategories: Category[]
  categoryTree: CategoryTreeNode[]
  rootCategories: Category[]
  categoryMap: Record<string, Category>
  leafCategories: LeafCategory[]
  leafParents: LeafParent[]
  generatedAt: string
  filteringStats: FilteringStats
}

const data: StaticCategoryData = {
  "allCategories": [
    {
      "id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "name": "Pánské",
      "handle": "panske",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "name": "Oblečení",
      "handle": "obleceni",
      "description": "Pánské oblečení",
      "parent_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKB9YJT7BCWH37BKREH19",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka",
      "description": "Pánská trika a tílka",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBAFQ45DEVPHWEJ0K8CA",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy",
      "parent_category_id": "pcat_01KJ8PKB9YJT7BCWH37BKREH19",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBB3PYWW0Q9QWVJSF1AD",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy",
      "parent_category_id": "pcat_01KJ8PKB9YJT7BCWH37BKREH19",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS",
      "name": "Mikiny",
      "handle": "mikiny",
      "description": "Pánské mikiny",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBCCDG4YJ6FS25GJ4W6V",
      "name": "Na zip",
      "handle": "na-zip",
      "description": "Pánské mikiny na zip",
      "parent_category_id": "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBCWGX9XEC6R6VKTSHV2",
      "name": "Přes hlavu",
      "handle": "pres-hlavu",
      "description": "Pánské mikiny přes hlavu",
      "parent_category_id": "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBDDHY0433PSM3TWDJMA",
      "name": "Bundy",
      "handle": "bundy",
      "description": "Pánské bundy",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBE1Q1TEC7914C61Q4XV",
      "name": "Street",
      "handle": "street",
      "description": "Pánské bundy do města",
      "parent_category_id": "pcat_01KJ8PKBDDHY0433PSM3TWDJMA",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBEMD43WXY03T267D062",
      "name": "Zimní",
      "handle": "zimni",
      "description": "Pánské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKBDDHY0433PSM3TWDJMA",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBF94AN5ZM81SBVTJN17",
      "name": "Svetry",
      "handle": "svetry",
      "description": "Pánské svetry",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBFWH4G7F3V781YEV25W",
      "name": "Košile",
      "handle": "kosile",
      "description": "Pánské košile",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7",
      "name": "Kalhoty",
      "handle": "kalhoty",
      "description": "Pánské kalhoty",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBH39QRGT5SW0ARDJHJ9",
      "name": "Street",
      "handle": "street-category-16",
      "description": "Pánské kalhoty pro volný čas",
      "parent_category_id": "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBHPRVVHA9RJS5M85K18",
      "name": "Zimní",
      "handle": "zimni-category-17",
      "description": "Pánské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBJ7F2ZAHRVTFMY0AQVZ",
      "name": "Kraťasy",
      "handle": "kratasy",
      "description": "Pánské kraťasy",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBJX8JAK0FY60KQ64MS1",
      "name": "Plavky",
      "handle": "plavky",
      "description": "Pánské plavky",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "name": "Doplňky",
      "handle": "doplnky",
      "description": "Pánské doplňky",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K",
      "name": "Boty",
      "handle": "boty",
      "description": "Pánské boty",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBMSNYZWPSAGV2AXBMFV",
      "name": "Street",
      "handle": "street-category-22",
      "description": "Pánské boty",
      "parent_category_id": "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBNCXNYR9ZM1PQBF35E7",
      "name": "Žabky",
      "handle": "zabky",
      "description": "Pánské žabky",
      "parent_category_id": "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBP53BWNA6KA775EERY1",
      "name": "Kulichy",
      "handle": "kulichy",
      "description": "Pánské kulichy",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBPSC6ED4H4T1HX2DYV9",
      "name": "Kšiltovky",
      "handle": "ksiltovky",
      "description": "Pánské kšiltovky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBQGB8HSYHX6F378EPZK",
      "name": "Tašky a batohy",
      "handle": "tasky-a-batohy",
      "description": "Pánské batohy",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBR3MQNGYDMBEJGBZJZ7",
      "name": "Rukavice",
      "handle": "rukavice",
      "description": "Pánské rukavice",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBRPK1514T6244GA0WXD",
      "name": "Ponožky",
      "handle": "ponozky",
      "description": "Pánské ponožky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBS7N2FS1CA3S4FKHKD1",
      "name": "Pásky",
      "handle": "pasky",
      "description": "Pánské pásky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBSWX4E6F6CBATSHTSXX",
      "name": "Peněženky",
      "handle": "penezenky",
      "description": "Pánské peněženky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBTCFBP4M8RPYS974X6V",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle",
      "description": "Pánské sluneční brýle",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBV4VZWQYMEK133CPS97",
      "name": "Ostatní",
      "handle": "ostatni",
      "description": "Ostatní doplňky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBVM4SC7QN572TTXZCSE",
      "name": "Cyklo",
      "handle": "cyklo",
      "description": "Pánská cyklistika",
      "parent_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3",
      "name": "Oblečení",
      "handle": "obleceni-category-34",
      "description": "Pánské cyklo oblečení",
      "parent_category_id": "pcat_01KJ8PKBVM4SC7QN572TTXZCSE",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBZ88RWAZH275FDB0BVC",
      "name": "Kalhoty",
      "handle": "kalhoty-category-39",
      "description": "Pánské cyklo kalhoty",
      "parent_category_id": "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBZZAQWVQVZMHT1R1G8J",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne",
      "description": "Pánské cyklo kalhoty XC/DH",
      "parent_category_id": "pcat_01KJ8PKBZ88RWAZH275FDB0BVC",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKC5A60AHD8Z1E95VX9A4",
      "name": "Ponožky",
      "handle": "ponozky-category-49",
      "description": "Pánské cyklo ponožky",
      "parent_category_id": "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKC72HXXW8HYVRJKD6HCN",
      "name": "Doplňky",
      "handle": "doplnky-category-52",
      "description": "Cyklistické doplňky",
      "parent_category_id": "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKC8VZMPZ31WWKBSZ8JSF",
      "name": "Ostatní",
      "handle": "ostatni-category-55",
      "description": "Ostatní doplňky",
      "parent_category_id": "pcat_01KJ8PKC72HXXW8HYVRJKD6HCN",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKCPNDHC3C1G3ZWMVDXKZ",
      "name": "Moto",
      "handle": "moto",
      "description": "Pánské moto vybavení",
      "parent_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKD2HB7K8HGF080NG3E18",
      "name": "Doplňky",
      "handle": "doplnky-category-98",
      "description": "Pánské moto doplňky",
      "parent_category_id": "pcat_01KJ8PKCPNDHC3C1G3ZWMVDXKZ",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKD3QWQF33RMRXRPFMBFS",
      "name": "Ostatní",
      "handle": "ostatni-category-100",
      "description": "Ostatní moto doplňky",
      "parent_category_id": "pcat_01KJ8PKD2HB7K8HGF080NG3E18",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKD4YF4AR68XHSRTQCJAS",
      "name": "Snb-Skate",
      "handle": "snb-skate",
      "description": "Pánský snowboarding a skateboarding",
      "parent_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "name": "Snowboarding",
      "handle": "snowboarding",
      "description": "Pánský snowboarding",
      "parent_category_id": "pcat_01KJ8PKD4YF4AR68XHSRTQCJAS",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKD92RMRM7ZZ514VX0HX5",
      "name": "Bundy",
      "handle": "bundy-category-109",
      "description": "Pánské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKD9PYDJKS1ST3SMM3ES9",
      "name": "Kalhoty",
      "handle": "kalhoty-category-110",
      "description": "Pánské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDA7QHQYB7S9WB9QH6V6",
      "name": "Rukavice",
      "handle": "rukavice-category-111",
      "description": "Pánské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDAXYZNBZRMFEJ2SGMKR",
      "name": "Kulichy",
      "handle": "kulichy-category-112",
      "description": "Pánské zimní kulichy",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDF7GRYW1XJPX1Q213SN",
      "name": "Ski",
      "handle": "ski",
      "description": "Pánské vybavení pro lyžaře",
      "parent_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "name": "Oblečení",
      "handle": "obleceni-category-120",
      "description": "Pánské zimní oblečení",
      "parent_category_id": "pcat_01KJ8PKDF7GRYW1XJPX1Q213SN",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDGJ7B5SZTMQ369N2GB7",
      "name": "Bundy",
      "handle": "bundy-category-121",
      "description": "Pánské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDH5KBW0TRMZA7WCDCTH",
      "name": "Kalhoty",
      "handle": "kalhoty-category-122",
      "description": "Pánské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDHRPJNQD62FA6007MEZ",
      "name": "Rukavice",
      "handle": "rukavice-category-123",
      "description": "Pánské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDJCGGP5EG5EJR5FHNXB",
      "name": "Kulichy",
      "handle": "kulichy-category-124",
      "description": "Pánské zimní kulichy",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDKJEVYBRJCSM5H1M477",
      "name": "Doplňky",
      "handle": "doplnky-category-126",
      "description": "Pánské zimní doplňky",
      "parent_category_id": "pcat_01KJ8PKDF7GRYW1XJPX1Q213SN",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDPKJ4EMQ3YSG8NN33T2",
      "name": "Batohy",
      "handle": "batohy",
      "description": "Pánské batohy",
      "parent_category_id": "pcat_01KJ8PKDKJEVYBRJCSM5H1M477",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDQ7YJQKY9BYZJA0CNCC",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-132",
      "description": "Pánské sluneční brýle",
      "parent_category_id": "pcat_01KJ8PKDKJEVYBRJCSM5H1M477",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "name": "Dámské",
      "handle": "damske",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "name": "Oblečení",
      "handle": "obleceni-category-134",
      "description": "Dámské oblečení",
      "parent_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka-category-135",
      "description": "Dámská trika a tílka",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDSMK7WQH7HF7TCA2P1Z",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy-category-136",
      "description": "Dámská trika s krátkými rukávy",
      "parent_category_id": "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDT8WKYYAN9E647MK9TB",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy-category-137",
      "description": "Dámská trika s dlouhými rukávy",
      "parent_category_id": "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN",
      "name": "Mikiny",
      "handle": "mikiny-category-138",
      "description": "Dámské mikiny",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDVEE8HTXZE24AQP18HB",
      "name": "Na zip",
      "handle": "na-zip-category-139",
      "description": "Dámské mikiny na zip",
      "parent_category_id": "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDW02AYTTAXHH9ZW9AEK",
      "name": "Přes hlavu",
      "handle": "pres-hlavu-category-140",
      "description": "Dámské mikiny přes hlavu",
      "parent_category_id": "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69",
      "name": "Bundy",
      "handle": "bundy-category-141",
      "description": "Dámské bundy",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDX7CTTRWFV0PWXEHXM9",
      "name": "Street",
      "handle": "street-category-142",
      "description": "Dámské bundy pro volný čas",
      "parent_category_id": "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDXTMMHKQZH5AMNN0HAZ",
      "name": "Zimní",
      "handle": "zimni-category-143",
      "description": "Dámské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDYBF7VBS3QWS82EHAA0",
      "name": "Svetry",
      "handle": "svetry-category-144",
      "description": "Dámské svetry",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDYXYBTRCFBWTBHG4X2P",
      "name": "Košile",
      "handle": "kosile-category-145",
      "description": "Dámské košile",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF",
      "name": "Kalhoty",
      "handle": "kalhoty-category-146",
      "description": "Dámské kalhoty",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE04YTC6CTPPWD4V7CC0",
      "name": "Street",
      "handle": "street-category-147",
      "description": "Dámské kalhoty pro volný čas",
      "parent_category_id": "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE0P7SJA4RE6P2ZGDJS5",
      "name": "Zimní",
      "handle": "zimni-category-148",
      "description": "Dámské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE1A8HKD0KD1X93E2D2Q",
      "name": "Kraťasy",
      "handle": "kratasy-category-149",
      "description": "Dámské šortky",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE1WK0P5R8QZ9A0GPJ4H",
      "name": "Plavky",
      "handle": "plavky-category-150",
      "description": "Dámské plavky",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE2GFYNJ8X08GYT4YB72",
      "name": "Šaty a sukně",
      "handle": "saty-a-sukne",
      "description": "Dámské šaty a sukně",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "name": "Doplňky",
      "handle": "doplnky-category-152",
      "description": "Dámské doplňky",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE3Q21Y0VX42H84AJ2QG",
      "name": "Boty",
      "handle": "boty-category-153",
      "description": "Dámské boty",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE4RSKFXVETYZ9ZQBA8X",
      "name": "Žabky",
      "handle": "zabky-category-155",
      "description": "Dámské žabky a sandály",
      "parent_category_id": "pcat_01KJ8PKE3Q21Y0VX42H84AJ2QG",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE5AAZNY9DYKNR9PFY8Z",
      "name": "Kulichy",
      "handle": "kulichy-category-156",
      "description": "Dámské kulichy",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE5Z6M3SAAXNEMPC7QAY",
      "name": "Kšiltovky",
      "handle": "ksiltovky-category-157",
      "description": "Dámské kšiltovky",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE6JFP7VRGN5TXG41Q3D",
      "name": "Tašky a batohy",
      "handle": "tasky-a-batohy-category-158",
      "description": "Dámské batohy a kabelky",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE750FPSXTC40E6GEVVZ",
      "name": "Rukavice",
      "handle": "rukavice-category-159",
      "description": "Dámské rukavice",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE7SY3X2K56VR3QX0VXA",
      "name": "Ponožky",
      "handle": "ponozky-category-160",
      "description": "Dámské ponožky",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE9JNC8TQXGRMRQCJ72S",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-163",
      "description": "Dámské sluneční brýle",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEA4WRS4SFY5WEE75F31",
      "name": "Ostatní",
      "handle": "ostatni-category-164",
      "description": "Ostatní doplňky",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEAQ9Q4MQ855WA3HP4PX",
      "name": "Cyklo",
      "handle": "cyklo-category-165",
      "description": "Dámská cyklistika",
      "parent_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "name": "Oblečení",
      "handle": "obleceni-category-166",
      "description": "Dámské cyklo oblečení",
      "parent_category_id": "pcat_01KJ8PKEAQ9Q4MQ855WA3HP4PX",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEDPACRC4KVVZMBK36YR",
      "name": "Bundy",
      "handle": "bundy-category-170",
      "description": "Dámské cyklo bundy",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF",
      "name": "Kraťasy",
      "handle": "kratasy-category-174",
      "description": "Dámské cyklo kraťasy",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEGN4BGAD2XNQ6R5YMTS",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne-category-175",
      "description": "Dámské cyklo šortky volné",
      "parent_category_id": "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEH8NJY4EF960YDTSRMK",
      "name": "Bib (elastické)",
      "handle": "bib-elasticke-category-176",
      "description": "Dámské cyklo šortky elastické",
      "parent_category_id": "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC",
      "name": "Rukavice",
      "handle": "rukavice-category-177",
      "description": "Dámské cyklo rukavice",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEJF85E0H2699F97QJSF",
      "name": "Dlouhé",
      "handle": "dlouhe-category-178",
      "description": "Dámské cyklo rukavice dlouhé",
      "parent_category_id": "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEK1XZE4JMCDPVRE0TE2",
      "name": "Krátké",
      "handle": "kratke-category-179",
      "description": "Dámské cyklo rukavice krátké",
      "parent_category_id": "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEM80WSC8TEMG37WGMQN",
      "name": "Ponožky",
      "handle": "ponozky-category-181",
      "description": "Dámské cyklo ponožky",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKENZ76HRFF74CZMH2ZQR",
      "name": "Doplňky",
      "handle": "doplnky-category-184",
      "description": "Dámské cyklo doplňky",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEQR622TN6S0F4AJRFGY",
      "name": "Ostatní",
      "handle": "ostatni-category-187",
      "description": "Ostatní doplňky",
      "parent_category_id": "pcat_01KJ8PKENZ76HRFF74CZMH2ZQR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFJYS429F3WQPNRBM592",
      "name": "Snb-Skate",
      "handle": "snb-skate-category-233",
      "description": "Dámský snowboarding a skateboarding",
      "parent_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "name": "Snowboarding",
      "handle": "snowboarding-category-234",
      "description": "Dámský snowboarding",
      "parent_category_id": "pcat_01KJ8PKFJYS429F3WQPNRBM592",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFQ5H7RWNYFMZ5JX5ZZQ",
      "name": "Bundy",
      "handle": "bundy-category-240",
      "description": "Dámské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFQSZWVQPAGQKZW3ZEG7",
      "name": "Kalhoty",
      "handle": "kalhoty-category-241",
      "description": "Dámské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFRBV6F8SXQ2GWA5F2H0",
      "name": "Rukavice",
      "handle": "rukavice-category-242",
      "description": "Dámské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFRX7W1T0V6747MEPJ1M",
      "name": "Kulichy",
      "handle": "kulichy-category-243",
      "description": "Dámské zimní kulichy",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFXSKR8Y1QTDD50YZJ7W",
      "name": "Ski",
      "handle": "ski-category-251",
      "description": "Dámské vybavení pro lyžaře",
      "parent_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "name": "Oblečení",
      "handle": "obleceni-category-252",
      "description": "Dámské zimní oblečení",
      "parent_category_id": "pcat_01KJ8PKFXSKR8Y1QTDD50YZJ7W",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFZ0SV466C80AFMRDATX",
      "name": "Bundy",
      "handle": "bundy-category-253",
      "description": "Dámské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFZJKENVZY7TDYGNEFDS",
      "name": "Kalhoty",
      "handle": "kalhoty-category-254",
      "description": "Dámské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKG05YY9B27TVAQ0REDR1",
      "name": "Rukavice",
      "handle": "rukavice-category-255",
      "description": "Dámské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKG0RX28P2Y3N8JMFNHNB",
      "name": "Kulichy",
      "handle": "kulichy-category-256",
      "description": "Dámské zimní kulichy",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKG1Z91DC7Z9PAWKPAN1S",
      "name": "Doplňky",
      "handle": "doplnky-category-258",
      "description": "Dámské zimní doplňky",
      "parent_category_id": "pcat_01KJ8PKFXSKR8Y1QTDD50YZJ7W",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKG4WM2WFJ69M1Q48232H",
      "name": "Batohy",
      "handle": "batohy-category-263",
      "description": "Dámské batohy",
      "parent_category_id": "pcat_01KJ8PKG1Z91DC7Z9PAWKPAN1S",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKG5GVKN7BY46PXPAM9RQ",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-264",
      "description": "Dámské sluneční brýle",
      "parent_category_id": "pcat_01KJ8PKG1Z91DC7Z9PAWKPAN1S",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ",
      "name": "Dětské",
      "handle": "detske",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "name": "Oblečení",
      "handle": "obleceni-category-266",
      "description": "Dětské oblečení",
      "parent_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka-category-267",
      "description": "Dětská trička",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKG7W9GNZGTH519V2XBPD",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy-category-268",
      "description": "Dětská trička s krátkými rukávy",
      "parent_category_id": "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKG8GFS2ZP46MAC43YT2Y",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy-category-269",
      "description": "Dětská trička s dlouhými rukávy",
      "parent_category_id": "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKG94N4CVM36AGYYQ58MS",
      "name": "Mikiny",
      "handle": "mikiny-category-270",
      "description": "Dětské mikiny",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGA862SWXQ8ZEB95TPBQ",
      "name": "Přes hlavu",
      "handle": "pres-hlavu-category-272",
      "description": "Dětské mikiny přes hlavu",
      "parent_category_id": "pcat_01KJ8PKG94N4CVM36AGYYQ58MS",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R",
      "name": "Bundy",
      "handle": "bundy-category-273",
      "description": "Dětské bundy",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGBACMHZ81KDHZP49B5H",
      "name": "Street",
      "handle": "street-category-274",
      "description": "Dětské bundy pro volný čas",
      "parent_category_id": "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGBXH1Q6QF0NH617TNF6",
      "name": "Zimní",
      "handle": "zimni-category-275",
      "description": "Dětské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF",
      "name": "Kalhoty",
      "handle": "kalhoty-category-276",
      "description": "Dětské kalhoty",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGD13CP39WJJX3H2X3KS",
      "name": "Street",
      "handle": "street-category-277",
      "description": "Dětské kalhoty pro volný čas",
      "parent_category_id": "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGDJPHS3TZMYXQZY82T9",
      "name": "Zimní",
      "handle": "zimni-category-278",
      "description": "Dětské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGE4DN810TW15BFM636Q",
      "name": "Kraťasy",
      "handle": "kratasy-category-279",
      "description": "Dětské kraťasy",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGEQGWTBJ0JD0J1GC1PB",
      "name": "Plavky",
      "handle": "plavky-category-280",
      "description": "Dětské plavky",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "name": "Doplňky",
      "handle": "doplnky-category-281",
      "description": "Dětské doplňky",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGGHSEVR2Q7HNSRM3A1S",
      "name": "Boty",
      "handle": "boty-category-282",
      "description": "Dětské boty",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGH3RS1WN6V7APCDK4ZB",
      "name": "Kulichy",
      "handle": "kulichy-category-283",
      "description": "Dětské kulichy",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGHSJQZ2VD48WBXQRCGK",
      "name": "Kšiltovky",
      "handle": "ksiltovky-category-284",
      "description": "Dětské kšiltovky",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGJCHAQ44ZGKC34H2RDJ",
      "name": "Rukavice",
      "handle": "rukavice-category-285",
      "description": "Dětské rukavice",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGKHHE9RN9KZWN2T4CPV",
      "name": "Ostatní",
      "handle": "ostatni-category-287",
      "description": "Ostatní doplňky",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKH8KTCTHDHNH3RJ5017R",
      "name": "Snb-Skate",
      "handle": "snb-skate-category-323",
      "description": "Dětský skateboarding a snowboarding",
      "parent_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "name": "Snowboarding",
      "handle": "snowboarding-category-324",
      "description": "Dětský snowboarding",
      "parent_category_id": "pcat_01KJ8PKH8KTCTHDHNH3RJ5017R",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHCP48HR09RTZ666F0V2",
      "name": "Bundy",
      "handle": "bundy-category-330",
      "description": "Dětské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHDD1MVBVHQYPNEXRRNG",
      "name": "Kalhoty",
      "handle": "kalhoty-category-331",
      "description": "Dětské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHE02GQBSXMWMJK708W9",
      "name": "Rukavice",
      "handle": "rukavice-category-332",
      "description": "Dětské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHEMW74614FCQBC87ND0",
      "name": "Kulichy",
      "handle": "kulichy-category-333",
      "description": "Dětské kulichy",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHGA633P51YAMQ2VQCE6",
      "name": "Ski",
      "handle": "ski-category-336",
      "description": "Dětské vybavení pro lyžaře",
      "parent_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "name": "Oblečení",
      "handle": "obleceni-category-337",
      "description": "Dětské zimní oblečení",
      "parent_category_id": "pcat_01KJ8PKHGA633P51YAMQ2VQCE6",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHHPW3FDJP0BABT512ZR",
      "name": "Bundy",
      "handle": "bundy-category-338",
      "description": "Dětské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHJ78Y321ARYY6EMJKF2",
      "name": "Kalhoty",
      "handle": "kalhoty-category-339",
      "description": "Dětské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHJVW0D8DSK4BTPZF4FB",
      "name": "Rukavice",
      "handle": "rukavice-category-340",
      "description": "Dětské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHKGJ79BMBMR3Q47AAXD",
      "name": "Kulichy",
      "handle": "kulichy-category-341",
      "description": "Dětské zimní kulichy",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "name": "Oblečení",
      "handle": "obleceni-category-347",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka-category-348",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHRJYETYMS5BZ64WA2J9",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy-category-349",
      "description": "Trika s krátkými rukávy",
      "parent_category_id": "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHS5AXX226EDC4NQ9PRR",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy-category-350",
      "description": "Trika s dlouhými rukávy",
      "parent_category_id": "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP",
      "name": "Mikiny",
      "handle": "mikiny-category-351",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHTESRFQACFAASYQ4S7V",
      "name": "Na zip",
      "handle": "na-zip-category-352",
      "description": "Mikiny na zip",
      "parent_category_id": "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHV1J6P2ZW8D851DCR2F",
      "name": "Přes hlavu",
      "handle": "pres-hlavu-category-353",
      "description": "Mikiny přes hlavu",
      "parent_category_id": "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV",
      "name": "Bundy",
      "handle": "bundy-category-354",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHW9GM84V9EV1DCEJJNQ",
      "name": "Street",
      "handle": "street-category-355",
      "parent_category_id": "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHX3C06P46Q96Q0M8V2T",
      "name": "Zimní",
      "handle": "zimni-category-356",
      "parent_category_id": "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHXPNMHEXJQ67J66X6RV",
      "name": "Svetry",
      "handle": "svetry-category-357",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHYF5Q2A0FHZ8CRSBVVB",
      "name": "Košile",
      "handle": "kosile-category-358",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53",
      "name": "Kalhoty",
      "handle": "kalhoty-category-359",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHZNFQ4QJ0K1FM2NF3V2",
      "name": "Street",
      "handle": "street-category-360",
      "parent_category_id": "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ09JNYFDMFYZV5TE74B",
      "name": "Zimní",
      "handle": "zimni-category-361",
      "parent_category_id": "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ0VQTC9NZ7NDA67EGMV",
      "name": "Kraťasy",
      "handle": "kratasy-category-362",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ1C6KY3GCWE83M7TSSZ",
      "name": "Plavky",
      "handle": "plavky-category-363",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "name": "Doplňky",
      "handle": "doplnky-category-364",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR",
      "name": "Boty",
      "handle": "boty-category-365",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ38TPV1S2YCHB1VKJC9",
      "name": "Street",
      "handle": "street-category-366",
      "parent_category_id": "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ3TAS6DQX44XBHSCW3D",
      "name": "Žabky",
      "handle": "zabky-category-367",
      "parent_category_id": "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ4CHHBV92JWAWJ2HETC",
      "name": "Kulichy",
      "handle": "kulichy-category-368",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ51S295GB4HXMHF9H4A",
      "name": "Kšiltovky",
      "handle": "ksiltovky-category-369",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ5N1HPW788N46X2B0V2",
      "name": "Tašky a batohy",
      "handle": "tasky-a-batohy-category-370",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ68NYGXN86WGKTBR1PQ",
      "name": "Rukavice",
      "handle": "rukavice-category-371",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ6SMMSJC6JCBN0KYN1Y",
      "name": "Ponožky",
      "handle": "ponozky-category-372",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ7CEYWGM0MWGBSGZQP3",
      "name": "Pásky",
      "handle": "pasky-category-373",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ7ZBAEGN539400PHX27",
      "name": "Peněženky",
      "handle": "penezenky-category-374",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ8J6DQKVJKGN8VF5EP6",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-375",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ95C4T5FMQS8YZ3FNED",
      "name": "Ostatní",
      "handle": "ostatni-category-376",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ9RXMV1D6BR1TQFZ4HP",
      "name": "Šaty a sukně",
      "handle": "saty-a-sukne-category-377",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR",
      "name": "Cyklo",
      "handle": "cyklo-category-378",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "name": "Oblečení",
      "handle": "obleceni-category-379",
      "parent_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJD5YCBMXQ19HC5D3H4Z",
      "name": "Bundy",
      "handle": "bundy-category-383",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJDR9GD9YZYA8873JSZP",
      "name": "Kalhoty",
      "handle": "kalhoty-category-384",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJE9N6789BMXX845JAQW",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne-category-385",
      "parent_category_id": "pcat_01KJ8PKJDR9GD9YZYA8873JSZP",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3",
      "name": "Kraťasy",
      "handle": "kratasy-category-387",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJG5NQMBAK24CYDAT9NZ",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne-category-388",
      "parent_category_id": "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJGQDDNVQVH92VNY8PB2",
      "name": "Bib (elastické)",
      "handle": "bib-elasticke-category-389",
      "parent_category_id": "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME",
      "name": "Rukavice",
      "handle": "rukavice-category-390",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJJ0RQGDCSB7DJ24G1WA",
      "name": "Dlouhé",
      "handle": "dlouhe-category-391",
      "parent_category_id": "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJJQHWXQQ7QZ7S2165DE",
      "name": "Krátké",
      "handle": "kratke-category-392",
      "parent_category_id": "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJKV5F90D18BN594S9X7",
      "name": "Ponožky",
      "handle": "ponozky-category-394",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJNHWTNE9QGMEXB8HR4V",
      "name": "Doplňky",
      "handle": "doplnky-category-397",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJQH8013X22SDFEGVDX7",
      "name": "Ostatní",
      "handle": "ostatni-category-400",
      "parent_category_id": "pcat_01KJ8PKJNHWTNE9QGMEXB8HR4V",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y",
      "name": "Moto",
      "handle": "moto-category-424",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKKJ51ND9ETH4HVYVA48K",
      "name": "Doplňky",
      "handle": "doplnky-category-444",
      "parent_category_id": "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y",
      "root_category_id": "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y"
    },
    {
      "id": "pcat_01KJ8PKKK9HE68GJ665VWWC19Q",
      "name": "Ostatní",
      "handle": "ostatni-category-446",
      "parent_category_id": "pcat_01KJ8PKKJ51ND9ETH4HVYVA48K",
      "root_category_id": "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y"
    },
    {
      "id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS",
      "name": "Snb-Skate",
      "handle": "snb-skate-category-448",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "name": "Snowboarding",
      "handle": "snowboarding-category-449",
      "parent_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    {
      "id": "pcat_01KJ8PKKRM26M39A3RNRA3BVGM",
      "name": "Bundy",
      "handle": "bundy-category-455",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    {
      "id": "pcat_01KJ8PKKS6Y9PK6RP5N31SFT2V",
      "name": "Kalhoty",
      "handle": "kalhoty-category-456",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    {
      "id": "pcat_01KJ8PKKSR5XFKZ3TAFE8HNQHQ",
      "name": "Rukavice",
      "handle": "rukavice-category-457",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    {
      "id": "pcat_01KJ8PKKTC44XRRAKGXB9RTHVY",
      "name": "Kulichy",
      "handle": "kulichy-category-458",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    {
      "id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC",
      "name": "Ski",
      "handle": "ski-category-466",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "name": "Oblečení",
      "handle": "obleceni-category-467",
      "parent_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM0A17E98H5KHNZPEJ9P",
      "name": "Bundy",
      "handle": "bundy-category-468",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM10ZEHAXH5Y3RYX5VV1",
      "name": "Kalhoty",
      "handle": "kalhoty-category-469",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM1JY2HW23ENTA4XJ516",
      "name": "Rukavice",
      "handle": "rukavice-category-470",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM258QYJN6X0BDY6RFVN",
      "name": "Kulichy",
      "handle": "kulichy-category-471",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM3GHWY8YQSEM3A002VM",
      "name": "Doplňky",
      "handle": "doplnky-category-473",
      "parent_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM6G2334KB5B65V2A9F3",
      "name": "Batohy",
      "handle": "batohy-category-478",
      "parent_category_id": "pcat_01KJ8PKM3GHWY8YQSEM3A002VM",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM71XV3KJ0E9PQFCDE2Z",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-479",
      "parent_category_id": "pcat_01KJ8PKM3GHWY8YQSEM3A002VM",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKRXA1NHP2S6TEB4HBQVW",
      "name": "Náhradní díly",
      "handle": "nahradni-dily-category-728",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKRYHFA0NWW62Y7PH814X",
      "name": "Náhradní díly",
      "handle": "nahradni-dily-category-730",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    {
      "id": "pcat_01KJ8PKTS4FNXT19VJDAPV0JVZ",
      "name": "Doplňky",
      "handle": "doplnky-komponenty",
      "parent_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKV221MC1Y78GWBXE0KKK",
      "name": "Lahve",
      "handle": "lahve",
      "parent_category_id": "pcat_01KJ8PKTS4FNXT19VJDAPV0JVZ",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    }
  ],
  "categoryTree": [
    {
      "id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "name": "Pánské",
      "handle": "panske",
      "children": [
        {
          "id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
          "name": "Oblečení",
          "handle": "obleceni",
          "description": "Pánské oblečení",
          "children": [
            {
              "id": "pcat_01KJ8PKB9YJT7BCWH37BKREH19",
              "name": "Trika a tílka",
              "handle": "trika-a-tilka",
              "description": "Pánská trika a tílka",
              "children": [
                {
                  "id": "pcat_01KJ8PKBAFQ45DEVPHWEJ0K8CA",
                  "name": "Krátké rukávy",
                  "handle": "kratke-rukavy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBB3PYWW0Q9QWVJSF1AD",
                  "name": "Dlouhé rukávy",
                  "handle": "dlouhe-rukavy",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS",
              "name": "Mikiny",
              "handle": "mikiny",
              "description": "Pánské mikiny",
              "children": [
                {
                  "id": "pcat_01KJ8PKBCCDG4YJ6FS25GJ4W6V",
                  "name": "Na zip",
                  "handle": "na-zip",
                  "description": "Pánské mikiny na zip",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBCWGX9XEC6R6VKTSHV2",
                  "name": "Přes hlavu",
                  "handle": "pres-hlavu",
                  "description": "Pánské mikiny přes hlavu",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKBDDHY0433PSM3TWDJMA",
              "name": "Bundy",
              "handle": "bundy",
              "description": "Pánské bundy",
              "children": [
                {
                  "id": "pcat_01KJ8PKBE1Q1TEC7914C61Q4XV",
                  "name": "Street",
                  "handle": "street",
                  "description": "Pánské bundy do města",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBEMD43WXY03T267D062",
                  "name": "Zimní",
                  "handle": "zimni",
                  "description": "Pánské zimní bundy",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKBF94AN5ZM81SBVTJN17",
              "name": "Svetry",
              "handle": "svetry",
              "description": "Pánské svetry",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKBFWH4G7F3V781YEV25W",
              "name": "Košile",
              "handle": "kosile",
              "description": "Pánské košile",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7",
              "name": "Kalhoty",
              "handle": "kalhoty",
              "description": "Pánské kalhoty",
              "children": [
                {
                  "id": "pcat_01KJ8PKBH39QRGT5SW0ARDJHJ9",
                  "name": "Street",
                  "handle": "street-category-16",
                  "description": "Pánské kalhoty pro volný čas",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBHPRVVHA9RJS5M85K18",
                  "name": "Zimní",
                  "handle": "zimni-category-17",
                  "description": "Pánské zimní kalhoty",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKBJ7F2ZAHRVTFMY0AQVZ",
              "name": "Kraťasy",
              "handle": "kratasy",
              "description": "Pánské kraťasy",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKBJX8JAK0FY60KQ64MS1",
              "name": "Plavky",
              "handle": "plavky",
              "description": "Pánské plavky",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
              "name": "Doplňky",
              "handle": "doplnky",
              "description": "Pánské doplňky",
              "children": [
                {
                  "id": "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K",
                  "name": "Boty",
                  "handle": "boty",
                  "description": "Pánské boty",
                  "children": [
                    {
                      "id": "pcat_01KJ8PKBMSNYZWPSAGV2AXBMFV",
                      "name": "Street",
                      "handle": "street-category-22",
                      "description": "Pánské boty",
                      "children": []
                    },
                    {
                      "id": "pcat_01KJ8PKBNCXNYR9ZM1PQBF35E7",
                      "name": "Žabky",
                      "handle": "zabky",
                      "description": "Pánské žabky",
                      "children": []
                    }
                  ]
                },
                {
                  "id": "pcat_01KJ8PKBP53BWNA6KA775EERY1",
                  "name": "Kulichy",
                  "handle": "kulichy",
                  "description": "Pánské kulichy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBPSC6ED4H4T1HX2DYV9",
                  "name": "Kšiltovky",
                  "handle": "ksiltovky",
                  "description": "Pánské kšiltovky",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBQGB8HSYHX6F378EPZK",
                  "name": "Tašky a batohy",
                  "handle": "tasky-a-batohy",
                  "description": "Pánské batohy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBR3MQNGYDMBEJGBZJZ7",
                  "name": "Rukavice",
                  "handle": "rukavice",
                  "description": "Pánské rukavice",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBRPK1514T6244GA0WXD",
                  "name": "Ponožky",
                  "handle": "ponozky",
                  "description": "Pánské ponožky",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBS7N2FS1CA3S4FKHKD1",
                  "name": "Pásky",
                  "handle": "pasky",
                  "description": "Pánské pásky",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBSWX4E6F6CBATSHTSXX",
                  "name": "Peněženky",
                  "handle": "penezenky",
                  "description": "Pánské peněženky",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBTCFBP4M8RPYS974X6V",
                  "name": "Sluneční brýle",
                  "handle": "slunecni-bryle",
                  "description": "Pánské sluneční brýle",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKBV4VZWQYMEK133CPS97",
                  "name": "Ostatní",
                  "handle": "ostatni",
                  "description": "Ostatní doplňky",
                  "children": []
                }
              ]
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKBVM4SC7QN572TTXZCSE",
          "name": "Cyklo",
          "handle": "cyklo",
          "description": "Pánská cyklistika",
          "children": [
            {
              "id": "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3",
              "name": "Oblečení",
              "handle": "obleceni-category-34",
              "description": "Pánské cyklo oblečení",
              "children": [
                {
                  "id": "pcat_01KJ8PKBZ88RWAZH275FDB0BVC",
                  "name": "Kalhoty",
                  "handle": "kalhoty-category-39",
                  "description": "Pánské cyklo kalhoty",
                  "children": [
                    {
                      "id": "pcat_01KJ8PKBZZAQWVQVZMHT1R1G8J",
                      "name": "XC/DH (volné)",
                      "handle": "xc-dh-volne",
                      "description": "Pánské cyklo kalhoty XC/DH",
                      "children": []
                    }
                  ]
                },
                {
                  "id": "pcat_01KJ8PKC5A60AHD8Z1E95VX9A4",
                  "name": "Ponožky",
                  "handle": "ponozky-category-49",
                  "description": "Pánské cyklo ponožky",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKC72HXXW8HYVRJKD6HCN",
                  "name": "Doplňky",
                  "handle": "doplnky-category-52",
                  "description": "Cyklistické doplňky",
                  "children": [
                    {
                      "id": "pcat_01KJ8PKC8VZMPZ31WWKBSZ8JSF",
                      "name": "Ostatní",
                      "handle": "ostatni-category-55",
                      "description": "Ostatní doplňky",
                      "children": []
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKCPNDHC3C1G3ZWMVDXKZ",
          "name": "Moto",
          "handle": "moto",
          "description": "Pánské moto vybavení",
          "children": [
            {
              "id": "pcat_01KJ8PKD2HB7K8HGF080NG3E18",
              "name": "Doplňky",
              "handle": "doplnky-category-98",
              "description": "Pánské moto doplňky",
              "children": [
                {
                  "id": "pcat_01KJ8PKD3QWQF33RMRXRPFMBFS",
                  "name": "Ostatní",
                  "handle": "ostatni-category-100",
                  "description": "Ostatní moto doplňky",
                  "children": []
                }
              ]
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKD4YF4AR68XHSRTQCJAS",
          "name": "Snb-Skate",
          "handle": "snb-skate",
          "description": "Pánský snowboarding a skateboarding",
          "children": [
            {
              "id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
              "name": "Snowboarding",
              "handle": "snowboarding",
              "description": "Pánský snowboarding",
              "children": [
                {
                  "id": "pcat_01KJ8PKD92RMRM7ZZ514VX0HX5",
                  "name": "Bundy",
                  "handle": "bundy-category-109",
                  "description": "Pánské zimní bundy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKD9PYDJKS1ST3SMM3ES9",
                  "name": "Kalhoty",
                  "handle": "kalhoty-category-110",
                  "description": "Pánské zimní kalhoty",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKDA7QHQYB7S9WB9QH6V6",
                  "name": "Rukavice",
                  "handle": "rukavice-category-111",
                  "description": "Pánské zimní rukavice",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKDAXYZNBZRMFEJ2SGMKR",
                  "name": "Kulichy",
                  "handle": "kulichy-category-112",
                  "description": "Pánské zimní kulichy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKRXA1NHP2S6TEB4HBQVW",
                  "name": "Náhradní díly",
                  "handle": "nahradni-dily-category-728",
                  "children": []
                }
              ]
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKDF7GRYW1XJPX1Q213SN",
          "name": "Ski",
          "handle": "ski",
          "description": "Pánské vybavení pro lyžaře",
          "children": [
            {
              "id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
              "name": "Oblečení",
              "handle": "obleceni-category-120",
              "description": "Pánské zimní oblečení",
              "children": [
                {
                  "id": "pcat_01KJ8PKDGJ7B5SZTMQ369N2GB7",
                  "name": "Bundy",
                  "handle": "bundy-category-121",
                  "description": "Pánské zimní bundy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKDH5KBW0TRMZA7WCDCTH",
                  "name": "Kalhoty",
                  "handle": "kalhoty-category-122",
                  "description": "Pánské zimní kalhoty",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKDHRPJNQD62FA6007MEZ",
                  "name": "Rukavice",
                  "handle": "rukavice-category-123",
                  "description": "Pánské zimní rukavice",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKDJCGGP5EG5EJR5FHNXB",
                  "name": "Kulichy",
                  "handle": "kulichy-category-124",
                  "description": "Pánské zimní kulichy",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKDKJEVYBRJCSM5H1M477",
              "name": "Doplňky",
              "handle": "doplnky-category-126",
              "description": "Pánské zimní doplňky",
              "children": [
                {
                  "id": "pcat_01KJ8PKDPKJ4EMQ3YSG8NN33T2",
                  "name": "Batohy",
                  "handle": "batohy",
                  "description": "Pánské batohy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKDQ7YJQKY9BYZJA0CNCC",
                  "name": "Sluneční brýle",
                  "handle": "slunecni-bryle-category-132",
                  "description": "Pánské sluneční brýle",
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "name": "Dámské",
      "handle": "damske",
      "children": [
        {
          "id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
          "name": "Oblečení",
          "handle": "obleceni-category-134",
          "description": "Dámské oblečení",
          "children": [
            {
              "id": "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1",
              "name": "Trika a tílka",
              "handle": "trika-a-tilka-category-135",
              "description": "Dámská trika a tílka",
              "children": [
                {
                  "id": "pcat_01KJ8PKDSMK7WQH7HF7TCA2P1Z",
                  "name": "Krátké rukávy",
                  "handle": "kratke-rukavy-category-136",
                  "description": "Dámská trika s krátkými rukávy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKDT8WKYYAN9E647MK9TB",
                  "name": "Dlouhé rukávy",
                  "handle": "dlouhe-rukavy-category-137",
                  "description": "Dámská trika s dlouhými rukávy",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN",
              "name": "Mikiny",
              "handle": "mikiny-category-138",
              "description": "Dámské mikiny",
              "children": [
                {
                  "id": "pcat_01KJ8PKDVEE8HTXZE24AQP18HB",
                  "name": "Na zip",
                  "handle": "na-zip-category-139",
                  "description": "Dámské mikiny na zip",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKDW02AYTTAXHH9ZW9AEK",
                  "name": "Přes hlavu",
                  "handle": "pres-hlavu-category-140",
                  "description": "Dámské mikiny přes hlavu",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69",
              "name": "Bundy",
              "handle": "bundy-category-141",
              "description": "Dámské bundy",
              "children": [
                {
                  "id": "pcat_01KJ8PKDX7CTTRWFV0PWXEHXM9",
                  "name": "Street",
                  "handle": "street-category-142",
                  "description": "Dámské bundy pro volný čas",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKDXTMMHKQZH5AMNN0HAZ",
                  "name": "Zimní",
                  "handle": "zimni-category-143",
                  "description": "Dámské zimní bundy",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKDYBF7VBS3QWS82EHAA0",
              "name": "Svetry",
              "handle": "svetry-category-144",
              "description": "Dámské svetry",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKDYXYBTRCFBWTBHG4X2P",
              "name": "Košile",
              "handle": "kosile-category-145",
              "description": "Dámské košile",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF",
              "name": "Kalhoty",
              "handle": "kalhoty-category-146",
              "description": "Dámské kalhoty",
              "children": [
                {
                  "id": "pcat_01KJ8PKE04YTC6CTPPWD4V7CC0",
                  "name": "Street",
                  "handle": "street-category-147",
                  "description": "Dámské kalhoty pro volný čas",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKE0P7SJA4RE6P2ZGDJS5",
                  "name": "Zimní",
                  "handle": "zimni-category-148",
                  "description": "Dámské zimní kalhoty",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKE1A8HKD0KD1X93E2D2Q",
              "name": "Kraťasy",
              "handle": "kratasy-category-149",
              "description": "Dámské šortky",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKE1WK0P5R8QZ9A0GPJ4H",
              "name": "Plavky",
              "handle": "plavky-category-150",
              "description": "Dámské plavky",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKE2GFYNJ8X08GYT4YB72",
              "name": "Šaty a sukně",
              "handle": "saty-a-sukne",
              "description": "Dámské šaty a sukně",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
              "name": "Doplňky",
              "handle": "doplnky-category-152",
              "description": "Dámské doplňky",
              "children": [
                {
                  "id": "pcat_01KJ8PKE3Q21Y0VX42H84AJ2QG",
                  "name": "Boty",
                  "handle": "boty-category-153",
                  "description": "Dámské boty",
                  "children": [
                    {
                      "id": "pcat_01KJ8PKE4RSKFXVETYZ9ZQBA8X",
                      "name": "Žabky",
                      "handle": "zabky-category-155",
                      "description": "Dámské žabky a sandály",
                      "children": []
                    }
                  ]
                },
                {
                  "id": "pcat_01KJ8PKE5AAZNY9DYKNR9PFY8Z",
                  "name": "Kulichy",
                  "handle": "kulichy-category-156",
                  "description": "Dámské kulichy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKE5Z6M3SAAXNEMPC7QAY",
                  "name": "Kšiltovky",
                  "handle": "ksiltovky-category-157",
                  "description": "Dámské kšiltovky",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKE6JFP7VRGN5TXG41Q3D",
                  "name": "Tašky a batohy",
                  "handle": "tasky-a-batohy-category-158",
                  "description": "Dámské batohy a kabelky",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKE750FPSXTC40E6GEVVZ",
                  "name": "Rukavice",
                  "handle": "rukavice-category-159",
                  "description": "Dámské rukavice",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKE7SY3X2K56VR3QX0VXA",
                  "name": "Ponožky",
                  "handle": "ponozky-category-160",
                  "description": "Dámské ponožky",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKE9JNC8TQXGRMRQCJ72S",
                  "name": "Sluneční brýle",
                  "handle": "slunecni-bryle-category-163",
                  "description": "Dámské sluneční brýle",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKEA4WRS4SFY5WEE75F31",
                  "name": "Ostatní",
                  "handle": "ostatni-category-164",
                  "description": "Ostatní doplňky",
                  "children": []
                }
              ]
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKEAQ9Q4MQ855WA3HP4PX",
          "name": "Cyklo",
          "handle": "cyklo-category-165",
          "description": "Dámská cyklistika",
          "children": [
            {
              "id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
              "name": "Oblečení",
              "handle": "obleceni-category-166",
              "description": "Dámské cyklo oblečení",
              "children": [
                {
                  "id": "pcat_01KJ8PKEDPACRC4KVVZMBK36YR",
                  "name": "Bundy",
                  "handle": "bundy-category-170",
                  "description": "Dámské cyklo bundy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF",
                  "name": "Kraťasy",
                  "handle": "kratasy-category-174",
                  "description": "Dámské cyklo kraťasy",
                  "children": [
                    {
                      "id": "pcat_01KJ8PKEGN4BGAD2XNQ6R5YMTS",
                      "name": "XC/DH (volné)",
                      "handle": "xc-dh-volne-category-175",
                      "description": "Dámské cyklo šortky volné",
                      "children": []
                    },
                    {
                      "id": "pcat_01KJ8PKEH8NJY4EF960YDTSRMK",
                      "name": "Bib (elastické)",
                      "handle": "bib-elasticke-category-176",
                      "description": "Dámské cyklo šortky elastické",
                      "children": []
                    }
                  ]
                },
                {
                  "id": "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC",
                  "name": "Rukavice",
                  "handle": "rukavice-category-177",
                  "description": "Dámské cyklo rukavice",
                  "children": [
                    {
                      "id": "pcat_01KJ8PKEJF85E0H2699F97QJSF",
                      "name": "Dlouhé",
                      "handle": "dlouhe-category-178",
                      "description": "Dámské cyklo rukavice dlouhé",
                      "children": []
                    },
                    {
                      "id": "pcat_01KJ8PKEK1XZE4JMCDPVRE0TE2",
                      "name": "Krátké",
                      "handle": "kratke-category-179",
                      "description": "Dámské cyklo rukavice krátké",
                      "children": []
                    }
                  ]
                },
                {
                  "id": "pcat_01KJ8PKEM80WSC8TEMG37WGMQN",
                  "name": "Ponožky",
                  "handle": "ponozky-category-181",
                  "description": "Dámské cyklo ponožky",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKENZ76HRFF74CZMH2ZQR",
                  "name": "Doplňky",
                  "handle": "doplnky-category-184",
                  "description": "Dámské cyklo doplňky",
                  "children": [
                    {
                      "id": "pcat_01KJ8PKEQR622TN6S0F4AJRFGY",
                      "name": "Ostatní",
                      "handle": "ostatni-category-187",
                      "description": "Ostatní doplňky",
                      "children": []
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKFJYS429F3WQPNRBM592",
          "name": "Snb-Skate",
          "handle": "snb-skate-category-233",
          "description": "Dámský snowboarding a skateboarding",
          "children": [
            {
              "id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
              "name": "Snowboarding",
              "handle": "snowboarding-category-234",
              "description": "Dámský snowboarding",
              "children": [
                {
                  "id": "pcat_01KJ8PKFQ5H7RWNYFMZ5JX5ZZQ",
                  "name": "Bundy",
                  "handle": "bundy-category-240",
                  "description": "Dámské zimní bundy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKFQSZWVQPAGQKZW3ZEG7",
                  "name": "Kalhoty",
                  "handle": "kalhoty-category-241",
                  "description": "Dámské zimní kalhoty",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKFRBV6F8SXQ2GWA5F2H0",
                  "name": "Rukavice",
                  "handle": "rukavice-category-242",
                  "description": "Dámské zimní rukavice",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKFRX7W1T0V6747MEPJ1M",
                  "name": "Kulichy",
                  "handle": "kulichy-category-243",
                  "description": "Dámské zimní kulichy",
                  "children": []
                }
              ]
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKFXSKR8Y1QTDD50YZJ7W",
          "name": "Ski",
          "handle": "ski-category-251",
          "description": "Dámské vybavení pro lyžaře",
          "children": [
            {
              "id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
              "name": "Oblečení",
              "handle": "obleceni-category-252",
              "description": "Dámské zimní oblečení",
              "children": [
                {
                  "id": "pcat_01KJ8PKFZ0SV466C80AFMRDATX",
                  "name": "Bundy",
                  "handle": "bundy-category-253",
                  "description": "Dámské zimní bundy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKFZJKENVZY7TDYGNEFDS",
                  "name": "Kalhoty",
                  "handle": "kalhoty-category-254",
                  "description": "Dámské zimní kalhoty",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKG05YY9B27TVAQ0REDR1",
                  "name": "Rukavice",
                  "handle": "rukavice-category-255",
                  "description": "Dámské zimní rukavice",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKG0RX28P2Y3N8JMFNHNB",
                  "name": "Kulichy",
                  "handle": "kulichy-category-256",
                  "description": "Dámské zimní kulichy",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKG1Z91DC7Z9PAWKPAN1S",
              "name": "Doplňky",
              "handle": "doplnky-category-258",
              "description": "Dámské zimní doplňky",
              "children": [
                {
                  "id": "pcat_01KJ8PKG4WM2WFJ69M1Q48232H",
                  "name": "Batohy",
                  "handle": "batohy-category-263",
                  "description": "Dámské batohy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKG5GVKN7BY46PXPAM9RQ",
                  "name": "Sluneční brýle",
                  "handle": "slunecni-bryle-category-264",
                  "description": "Dámské sluneční brýle",
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ",
      "name": "Dětské",
      "handle": "detske",
      "children": [
        {
          "id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
          "name": "Oblečení",
          "handle": "obleceni-category-266",
          "description": "Dětské oblečení",
          "children": [
            {
              "id": "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC",
              "name": "Trika a tílka",
              "handle": "trika-a-tilka-category-267",
              "description": "Dětská trička",
              "children": [
                {
                  "id": "pcat_01KJ8PKG7W9GNZGTH519V2XBPD",
                  "name": "Krátké rukávy",
                  "handle": "kratke-rukavy-category-268",
                  "description": "Dětská trička s krátkými rukávy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKG8GFS2ZP46MAC43YT2Y",
                  "name": "Dlouhé rukávy",
                  "handle": "dlouhe-rukavy-category-269",
                  "description": "Dětská trička s dlouhými rukávy",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKG94N4CVM36AGYYQ58MS",
              "name": "Mikiny",
              "handle": "mikiny-category-270",
              "description": "Dětské mikiny",
              "children": [
                {
                  "id": "pcat_01KJ8PKGA862SWXQ8ZEB95TPBQ",
                  "name": "Přes hlavu",
                  "handle": "pres-hlavu-category-272",
                  "description": "Dětské mikiny přes hlavu",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R",
              "name": "Bundy",
              "handle": "bundy-category-273",
              "description": "Dětské bundy",
              "children": [
                {
                  "id": "pcat_01KJ8PKGBACMHZ81KDHZP49B5H",
                  "name": "Street",
                  "handle": "street-category-274",
                  "description": "Dětské bundy pro volný čas",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKGBXH1Q6QF0NH617TNF6",
                  "name": "Zimní",
                  "handle": "zimni-category-275",
                  "description": "Dětské zimní bundy",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF",
              "name": "Kalhoty",
              "handle": "kalhoty-category-276",
              "description": "Dětské kalhoty",
              "children": [
                {
                  "id": "pcat_01KJ8PKGD13CP39WJJX3H2X3KS",
                  "name": "Street",
                  "handle": "street-category-277",
                  "description": "Dětské kalhoty pro volný čas",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKGDJPHS3TZMYXQZY82T9",
                  "name": "Zimní",
                  "handle": "zimni-category-278",
                  "description": "Dětské zimní kalhoty",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKGE4DN810TW15BFM636Q",
              "name": "Kraťasy",
              "handle": "kratasy-category-279",
              "description": "Dětské kraťasy",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKGEQGWTBJ0JD0J1GC1PB",
              "name": "Plavky",
              "handle": "plavky-category-280",
              "description": "Dětské plavky",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
              "name": "Doplňky",
              "handle": "doplnky-category-281",
              "description": "Dětské doplňky",
              "children": [
                {
                  "id": "pcat_01KJ8PKGGHSEVR2Q7HNSRM3A1S",
                  "name": "Boty",
                  "handle": "boty-category-282",
                  "description": "Dětské boty",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKGH3RS1WN6V7APCDK4ZB",
                  "name": "Kulichy",
                  "handle": "kulichy-category-283",
                  "description": "Dětské kulichy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKGHSJQZ2VD48WBXQRCGK",
                  "name": "Kšiltovky",
                  "handle": "ksiltovky-category-284",
                  "description": "Dětské kšiltovky",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKGJCHAQ44ZGKC34H2RDJ",
                  "name": "Rukavice",
                  "handle": "rukavice-category-285",
                  "description": "Dětské rukavice",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKGKHHE9RN9KZWN2T4CPV",
                  "name": "Ostatní",
                  "handle": "ostatni-category-287",
                  "description": "Ostatní doplňky",
                  "children": []
                }
              ]
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKH8KTCTHDHNH3RJ5017R",
          "name": "Snb-Skate",
          "handle": "snb-skate-category-323",
          "description": "Dětský skateboarding a snowboarding",
          "children": [
            {
              "id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
              "name": "Snowboarding",
              "handle": "snowboarding-category-324",
              "description": "Dětský snowboarding",
              "children": [
                {
                  "id": "pcat_01KJ8PKHCP48HR09RTZ666F0V2",
                  "name": "Bundy",
                  "handle": "bundy-category-330",
                  "description": "Dětské zimní bundy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKHDD1MVBVHQYPNEXRRNG",
                  "name": "Kalhoty",
                  "handle": "kalhoty-category-331",
                  "description": "Dětské zimní kalhoty",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKHE02GQBSXMWMJK708W9",
                  "name": "Rukavice",
                  "handle": "rukavice-category-332",
                  "description": "Dětské zimní rukavice",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKHEMW74614FCQBC87ND0",
                  "name": "Kulichy",
                  "handle": "kulichy-category-333",
                  "description": "Dětské kulichy",
                  "children": []
                }
              ]
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKHGA633P51YAMQ2VQCE6",
          "name": "Ski",
          "handle": "ski-category-336",
          "description": "Dětské vybavení pro lyžaře",
          "children": [
            {
              "id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
              "name": "Oblečení",
              "handle": "obleceni-category-337",
              "description": "Dětské zimní oblečení",
              "children": [
                {
                  "id": "pcat_01KJ8PKHHPW3FDJP0BABT512ZR",
                  "name": "Bundy",
                  "handle": "bundy-category-338",
                  "description": "Dětské zimní bundy",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKHJ78Y321ARYY6EMJKF2",
                  "name": "Kalhoty",
                  "handle": "kalhoty-category-339",
                  "description": "Dětské zimní kalhoty",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKHJVW0D8DSK4BTPZF4FB",
                  "name": "Rukavice",
                  "handle": "rukavice-category-340",
                  "description": "Dětské zimní rukavice",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKHKGJ79BMBMR3Q47AAXD",
                  "name": "Kulichy",
                  "handle": "kulichy-category-341",
                  "description": "Dětské zimní kulichy",
                  "children": []
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "name": "Oblečení",
      "handle": "obleceni-category-347",
      "children": [
        {
          "id": "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS",
          "name": "Trika a tílka",
          "handle": "trika-a-tilka-category-348",
          "children": [
            {
              "id": "pcat_01KJ8PKHRJYETYMS5BZ64WA2J9",
              "name": "Krátké rukávy",
              "handle": "kratke-rukavy-category-349",
              "description": "Trika s krátkými rukávy",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKHS5AXX226EDC4NQ9PRR",
              "name": "Dlouhé rukávy",
              "handle": "dlouhe-rukavy-category-350",
              "description": "Trika s dlouhými rukávy",
              "children": []
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP",
          "name": "Mikiny",
          "handle": "mikiny-category-351",
          "children": [
            {
              "id": "pcat_01KJ8PKHTESRFQACFAASYQ4S7V",
              "name": "Na zip",
              "handle": "na-zip-category-352",
              "description": "Mikiny na zip",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKHV1J6P2ZW8D851DCR2F",
              "name": "Přes hlavu",
              "handle": "pres-hlavu-category-353",
              "description": "Mikiny přes hlavu",
              "children": []
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV",
          "name": "Bundy",
          "handle": "bundy-category-354",
          "children": [
            {
              "id": "pcat_01KJ8PKHW9GM84V9EV1DCEJJNQ",
              "name": "Street",
              "handle": "street-category-355",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKHX3C06P46Q96Q0M8V2T",
              "name": "Zimní",
              "handle": "zimni-category-356",
              "children": []
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKHXPNMHEXJQ67J66X6RV",
          "name": "Svetry",
          "handle": "svetry-category-357",
          "children": []
        },
        {
          "id": "pcat_01KJ8PKHYF5Q2A0FHZ8CRSBVVB",
          "name": "Košile",
          "handle": "kosile-category-358",
          "children": []
        },
        {
          "id": "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53",
          "name": "Kalhoty",
          "handle": "kalhoty-category-359",
          "children": [
            {
              "id": "pcat_01KJ8PKHZNFQ4QJ0K1FM2NF3V2",
              "name": "Street",
              "handle": "street-category-360",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKJ09JNYFDMFYZV5TE74B",
              "name": "Zimní",
              "handle": "zimni-category-361",
              "children": []
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKJ0VQTC9NZ7NDA67EGMV",
          "name": "Kraťasy",
          "handle": "kratasy-category-362",
          "children": []
        },
        {
          "id": "pcat_01KJ8PKJ1C6KY3GCWE83M7TSSZ",
          "name": "Plavky",
          "handle": "plavky-category-363",
          "children": []
        },
        {
          "id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
          "name": "Doplňky",
          "handle": "doplnky-category-364",
          "children": [
            {
              "id": "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR",
              "name": "Boty",
              "handle": "boty-category-365",
              "children": [
                {
                  "id": "pcat_01KJ8PKJ38TPV1S2YCHB1VKJC9",
                  "name": "Street",
                  "handle": "street-category-366",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKJ3TAS6DQX44XBHSCW3D",
                  "name": "Žabky",
                  "handle": "zabky-category-367",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKJ4CHHBV92JWAWJ2HETC",
              "name": "Kulichy",
              "handle": "kulichy-category-368",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKJ51S295GB4HXMHF9H4A",
              "name": "Kšiltovky",
              "handle": "ksiltovky-category-369",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKJ5N1HPW788N46X2B0V2",
              "name": "Tašky a batohy",
              "handle": "tasky-a-batohy-category-370",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKJ68NYGXN86WGKTBR1PQ",
              "name": "Rukavice",
              "handle": "rukavice-category-371",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKJ6SMMSJC6JCBN0KYN1Y",
              "name": "Ponožky",
              "handle": "ponozky-category-372",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKJ7CEYWGM0MWGBSGZQP3",
              "name": "Pásky",
              "handle": "pasky-category-373",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKJ7ZBAEGN539400PHX27",
              "name": "Peněženky",
              "handle": "penezenky-category-374",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKJ8J6DQKVJKGN8VF5EP6",
              "name": "Sluneční brýle",
              "handle": "slunecni-bryle-category-375",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKJ95C4T5FMQS8YZ3FNED",
              "name": "Ostatní",
              "handle": "ostatni-category-376",
              "children": []
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKJ9RXMV1D6BR1TQFZ4HP",
          "name": "Šaty a sukně",
          "handle": "saty-a-sukne-category-377",
          "children": []
        }
      ]
    },
    {
      "id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR",
      "name": "Cyklo",
      "handle": "cyklo-category-378",
      "children": [
        {
          "id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
          "name": "Oblečení",
          "handle": "obleceni-category-379",
          "children": [
            {
              "id": "pcat_01KJ8PKJD5YCBMXQ19HC5D3H4Z",
              "name": "Bundy",
              "handle": "bundy-category-383",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKJDR9GD9YZYA8873JSZP",
              "name": "Kalhoty",
              "handle": "kalhoty-category-384",
              "children": [
                {
                  "id": "pcat_01KJ8PKJE9N6789BMXX845JAQW",
                  "name": "XC/DH (volné)",
                  "handle": "xc-dh-volne-category-385",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3",
              "name": "Kraťasy",
              "handle": "kratasy-category-387",
              "children": [
                {
                  "id": "pcat_01KJ8PKJG5NQMBAK24CYDAT9NZ",
                  "name": "XC/DH (volné)",
                  "handle": "xc-dh-volne-category-388",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKJGQDDNVQVH92VNY8PB2",
                  "name": "Bib (elastické)",
                  "handle": "bib-elasticke-category-389",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME",
              "name": "Rukavice",
              "handle": "rukavice-category-390",
              "children": [
                {
                  "id": "pcat_01KJ8PKJJ0RQGDCSB7DJ24G1WA",
                  "name": "Dlouhé",
                  "handle": "dlouhe-category-391",
                  "children": []
                },
                {
                  "id": "pcat_01KJ8PKJJQHWXQQ7QZ7S2165DE",
                  "name": "Krátké",
                  "handle": "kratke-category-392",
                  "children": []
                }
              ]
            },
            {
              "id": "pcat_01KJ8PKJKV5F90D18BN594S9X7",
              "name": "Ponožky",
              "handle": "ponozky-category-394",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKJNHWTNE9QGMEXB8HR4V",
              "name": "Doplňky",
              "handle": "doplnky-category-397",
              "children": [
                {
                  "id": "pcat_01KJ8PKJQH8013X22SDFEGVDX7",
                  "name": "Ostatní",
                  "handle": "ostatni-category-400",
                  "children": []
                }
              ]
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKTS4FNXT19VJDAPV0JVZ",
          "name": "Doplňky",
          "handle": "doplnky-komponenty",
          "children": [
            {
              "id": "pcat_01KJ8PKV221MC1Y78GWBXE0KKK",
              "name": "Lahve",
              "handle": "lahve",
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y",
      "name": "Moto",
      "handle": "moto-category-424",
      "children": [
        {
          "id": "pcat_01KJ8PKKJ51ND9ETH4HVYVA48K",
          "name": "Doplňky",
          "handle": "doplnky-category-444",
          "children": [
            {
              "id": "pcat_01KJ8PKKK9HE68GJ665VWWC19Q",
              "name": "Ostatní",
              "handle": "ostatni-category-446",
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS",
      "name": "Snb-Skate",
      "handle": "snb-skate-category-448",
      "children": [
        {
          "id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
          "name": "Snowboarding",
          "handle": "snowboarding-category-449",
          "children": [
            {
              "id": "pcat_01KJ8PKKRM26M39A3RNRA3BVGM",
              "name": "Bundy",
              "handle": "bundy-category-455",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKKS6Y9PK6RP5N31SFT2V",
              "name": "Kalhoty",
              "handle": "kalhoty-category-456",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKKSR5XFKZ3TAFE8HNQHQ",
              "name": "Rukavice",
              "handle": "rukavice-category-457",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKKTC44XRRAKGXB9RTHVY",
              "name": "Kulichy",
              "handle": "kulichy-category-458",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKRYHFA0NWW62Y7PH814X",
              "name": "Náhradní díly",
              "handle": "nahradni-dily-category-730",
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC",
      "name": "Ski",
      "handle": "ski-category-466",
      "children": [
        {
          "id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
          "name": "Oblečení",
          "handle": "obleceni-category-467",
          "children": [
            {
              "id": "pcat_01KJ8PKM0A17E98H5KHNZPEJ9P",
              "name": "Bundy",
              "handle": "bundy-category-468",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKM10ZEHAXH5Y3RYX5VV1",
              "name": "Kalhoty",
              "handle": "kalhoty-category-469",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKM1JY2HW23ENTA4XJ516",
              "name": "Rukavice",
              "handle": "rukavice-category-470",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKM258QYJN6X0BDY6RFVN",
              "name": "Kulichy",
              "handle": "kulichy-category-471",
              "children": []
            }
          ]
        },
        {
          "id": "pcat_01KJ8PKM3GHWY8YQSEM3A002VM",
          "name": "Doplňky",
          "handle": "doplnky-category-473",
          "children": [
            {
              "id": "pcat_01KJ8PKM6G2334KB5B65V2A9F3",
              "name": "Batohy",
              "handle": "batohy-category-478",
              "children": []
            },
            {
              "id": "pcat_01KJ8PKM71XV3KJ0E9PQFCDE2Z",
              "name": "Sluneční brýle",
              "handle": "slunecni-bryle-category-479",
              "children": []
            }
          ]
        }
      ]
    }
  ],
  "rootCategories": [
    {
      "id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "name": "Pánské",
      "handle": "panske",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "name": "Dámské",
      "handle": "damske",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ",
      "name": "Dětské",
      "handle": "detske",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "name": "Oblečení",
      "handle": "obleceni-category-347",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR",
      "name": "Cyklo",
      "handle": "cyklo-category-378",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y",
      "name": "Moto",
      "handle": "moto-category-424",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS",
      "name": "Snb-Skate",
      "handle": "snb-skate-category-448",
      "parent_category_id": null,
      "root_category_id": null
    },
    {
      "id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC",
      "name": "Ski",
      "handle": "ski-category-466",
      "parent_category_id": null,
      "root_category_id": null
    }
  ],
  "categoryMap": {
    "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4": {
      "id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "name": "Pánské",
      "handle": "panske",
      "parent_category_id": null,
      "root_category_id": null
    },
    "pcat_01KJ8PKB9CQ855VDE8PKHNWH95": {
      "id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "name": "Oblečení",
      "handle": "obleceni",
      "description": "Pánské oblečení",
      "parent_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKB9YJT7BCWH37BKREH19": {
      "id": "pcat_01KJ8PKB9YJT7BCWH37BKREH19",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka",
      "description": "Pánská trika a tílka",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBAFQ45DEVPHWEJ0K8CA": {
      "id": "pcat_01KJ8PKBAFQ45DEVPHWEJ0K8CA",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy",
      "parent_category_id": "pcat_01KJ8PKB9YJT7BCWH37BKREH19",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBB3PYWW0Q9QWVJSF1AD": {
      "id": "pcat_01KJ8PKBB3PYWW0Q9QWVJSF1AD",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy",
      "parent_category_id": "pcat_01KJ8PKB9YJT7BCWH37BKREH19",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS": {
      "id": "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS",
      "name": "Mikiny",
      "handle": "mikiny",
      "description": "Pánské mikiny",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBCCDG4YJ6FS25GJ4W6V": {
      "id": "pcat_01KJ8PKBCCDG4YJ6FS25GJ4W6V",
      "name": "Na zip",
      "handle": "na-zip",
      "description": "Pánské mikiny na zip",
      "parent_category_id": "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBCWGX9XEC6R6VKTSHV2": {
      "id": "pcat_01KJ8PKBCWGX9XEC6R6VKTSHV2",
      "name": "Přes hlavu",
      "handle": "pres-hlavu",
      "description": "Pánské mikiny přes hlavu",
      "parent_category_id": "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBDDHY0433PSM3TWDJMA": {
      "id": "pcat_01KJ8PKBDDHY0433PSM3TWDJMA",
      "name": "Bundy",
      "handle": "bundy",
      "description": "Pánské bundy",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBE1Q1TEC7914C61Q4XV": {
      "id": "pcat_01KJ8PKBE1Q1TEC7914C61Q4XV",
      "name": "Street",
      "handle": "street",
      "description": "Pánské bundy do města",
      "parent_category_id": "pcat_01KJ8PKBDDHY0433PSM3TWDJMA",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBEMD43WXY03T267D062": {
      "id": "pcat_01KJ8PKBEMD43WXY03T267D062",
      "name": "Zimní",
      "handle": "zimni",
      "description": "Pánské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKBDDHY0433PSM3TWDJMA",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBF94AN5ZM81SBVTJN17": {
      "id": "pcat_01KJ8PKBF94AN5ZM81SBVTJN17",
      "name": "Svetry",
      "handle": "svetry",
      "description": "Pánské svetry",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBFWH4G7F3V781YEV25W": {
      "id": "pcat_01KJ8PKBFWH4G7F3V781YEV25W",
      "name": "Košile",
      "handle": "kosile",
      "description": "Pánské košile",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7": {
      "id": "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7",
      "name": "Kalhoty",
      "handle": "kalhoty",
      "description": "Pánské kalhoty",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBH39QRGT5SW0ARDJHJ9": {
      "id": "pcat_01KJ8PKBH39QRGT5SW0ARDJHJ9",
      "name": "Street",
      "handle": "street-category-16",
      "description": "Pánské kalhoty pro volný čas",
      "parent_category_id": "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBHPRVVHA9RJS5M85K18": {
      "id": "pcat_01KJ8PKBHPRVVHA9RJS5M85K18",
      "name": "Zimní",
      "handle": "zimni-category-17",
      "description": "Pánské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBJ7F2ZAHRVTFMY0AQVZ": {
      "id": "pcat_01KJ8PKBJ7F2ZAHRVTFMY0AQVZ",
      "name": "Kraťasy",
      "handle": "kratasy",
      "description": "Pánské kraťasy",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBJX8JAK0FY60KQ64MS1": {
      "id": "pcat_01KJ8PKBJX8JAK0FY60KQ64MS1",
      "name": "Plavky",
      "handle": "plavky",
      "description": "Pánské plavky",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH": {
      "id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "name": "Doplňky",
      "handle": "doplnky",
      "description": "Pánské doplňky",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K": {
      "id": "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K",
      "name": "Boty",
      "handle": "boty",
      "description": "Pánské boty",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBMSNYZWPSAGV2AXBMFV": {
      "id": "pcat_01KJ8PKBMSNYZWPSAGV2AXBMFV",
      "name": "Street",
      "handle": "street-category-22",
      "description": "Pánské boty",
      "parent_category_id": "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBNCXNYR9ZM1PQBF35E7": {
      "id": "pcat_01KJ8PKBNCXNYR9ZM1PQBF35E7",
      "name": "Žabky",
      "handle": "zabky",
      "description": "Pánské žabky",
      "parent_category_id": "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBP53BWNA6KA775EERY1": {
      "id": "pcat_01KJ8PKBP53BWNA6KA775EERY1",
      "name": "Kulichy",
      "handle": "kulichy",
      "description": "Pánské kulichy",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBPSC6ED4H4T1HX2DYV9": {
      "id": "pcat_01KJ8PKBPSC6ED4H4T1HX2DYV9",
      "name": "Kšiltovky",
      "handle": "ksiltovky",
      "description": "Pánské kšiltovky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBQGB8HSYHX6F378EPZK": {
      "id": "pcat_01KJ8PKBQGB8HSYHX6F378EPZK",
      "name": "Tašky a batohy",
      "handle": "tasky-a-batohy",
      "description": "Pánské batohy",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBR3MQNGYDMBEJGBZJZ7": {
      "id": "pcat_01KJ8PKBR3MQNGYDMBEJGBZJZ7",
      "name": "Rukavice",
      "handle": "rukavice",
      "description": "Pánské rukavice",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBRPK1514T6244GA0WXD": {
      "id": "pcat_01KJ8PKBRPK1514T6244GA0WXD",
      "name": "Ponožky",
      "handle": "ponozky",
      "description": "Pánské ponožky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBS7N2FS1CA3S4FKHKD1": {
      "id": "pcat_01KJ8PKBS7N2FS1CA3S4FKHKD1",
      "name": "Pásky",
      "handle": "pasky",
      "description": "Pánské pásky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBSWX4E6F6CBATSHTSXX": {
      "id": "pcat_01KJ8PKBSWX4E6F6CBATSHTSXX",
      "name": "Peněženky",
      "handle": "penezenky",
      "description": "Pánské peněženky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBTCFBP4M8RPYS974X6V": {
      "id": "pcat_01KJ8PKBTCFBP4M8RPYS974X6V",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle",
      "description": "Pánské sluneční brýle",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBV4VZWQYMEK133CPS97": {
      "id": "pcat_01KJ8PKBV4VZWQYMEK133CPS97",
      "name": "Ostatní",
      "handle": "ostatni",
      "description": "Ostatní doplňky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBVM4SC7QN572TTXZCSE": {
      "id": "pcat_01KJ8PKBVM4SC7QN572TTXZCSE",
      "name": "Cyklo",
      "handle": "cyklo",
      "description": "Pánská cyklistika",
      "parent_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3": {
      "id": "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3",
      "name": "Oblečení",
      "handle": "obleceni-category-34",
      "description": "Pánské cyklo oblečení",
      "parent_category_id": "pcat_01KJ8PKBVM4SC7QN572TTXZCSE",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBZ88RWAZH275FDB0BVC": {
      "id": "pcat_01KJ8PKBZ88RWAZH275FDB0BVC",
      "name": "Kalhoty",
      "handle": "kalhoty-category-39",
      "description": "Pánské cyklo kalhoty",
      "parent_category_id": "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKBZZAQWVQVZMHT1R1G8J": {
      "id": "pcat_01KJ8PKBZZAQWVQVZMHT1R1G8J",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne",
      "description": "Pánské cyklo kalhoty XC/DH",
      "parent_category_id": "pcat_01KJ8PKBZ88RWAZH275FDB0BVC",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKC5A60AHD8Z1E95VX9A4": {
      "id": "pcat_01KJ8PKC5A60AHD8Z1E95VX9A4",
      "name": "Ponožky",
      "handle": "ponozky-category-49",
      "description": "Pánské cyklo ponožky",
      "parent_category_id": "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKC72HXXW8HYVRJKD6HCN": {
      "id": "pcat_01KJ8PKC72HXXW8HYVRJKD6HCN",
      "name": "Doplňky",
      "handle": "doplnky-category-52",
      "description": "Cyklistické doplňky",
      "parent_category_id": "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKC8VZMPZ31WWKBSZ8JSF": {
      "id": "pcat_01KJ8PKC8VZMPZ31WWKBSZ8JSF",
      "name": "Ostatní",
      "handle": "ostatni-category-55",
      "description": "Ostatní doplňky",
      "parent_category_id": "pcat_01KJ8PKC72HXXW8HYVRJKD6HCN",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKCPNDHC3C1G3ZWMVDXKZ": {
      "id": "pcat_01KJ8PKCPNDHC3C1G3ZWMVDXKZ",
      "name": "Moto",
      "handle": "moto",
      "description": "Pánské moto vybavení",
      "parent_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKD2HB7K8HGF080NG3E18": {
      "id": "pcat_01KJ8PKD2HB7K8HGF080NG3E18",
      "name": "Doplňky",
      "handle": "doplnky-category-98",
      "description": "Pánské moto doplňky",
      "parent_category_id": "pcat_01KJ8PKCPNDHC3C1G3ZWMVDXKZ",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKD3QWQF33RMRXRPFMBFS": {
      "id": "pcat_01KJ8PKD3QWQF33RMRXRPFMBFS",
      "name": "Ostatní",
      "handle": "ostatni-category-100",
      "description": "Ostatní moto doplňky",
      "parent_category_id": "pcat_01KJ8PKD2HB7K8HGF080NG3E18",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKD4YF4AR68XHSRTQCJAS": {
      "id": "pcat_01KJ8PKD4YF4AR68XHSRTQCJAS",
      "name": "Snb-Skate",
      "handle": "snb-skate",
      "description": "Pánský snowboarding a skateboarding",
      "parent_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V": {
      "id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "name": "Snowboarding",
      "handle": "snowboarding",
      "description": "Pánský snowboarding",
      "parent_category_id": "pcat_01KJ8PKD4YF4AR68XHSRTQCJAS",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKD92RMRM7ZZ514VX0HX5": {
      "id": "pcat_01KJ8PKD92RMRM7ZZ514VX0HX5",
      "name": "Bundy",
      "handle": "bundy-category-109",
      "description": "Pánské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKD9PYDJKS1ST3SMM3ES9": {
      "id": "pcat_01KJ8PKD9PYDJKS1ST3SMM3ES9",
      "name": "Kalhoty",
      "handle": "kalhoty-category-110",
      "description": "Pánské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDA7QHQYB7S9WB9QH6V6": {
      "id": "pcat_01KJ8PKDA7QHQYB7S9WB9QH6V6",
      "name": "Rukavice",
      "handle": "rukavice-category-111",
      "description": "Pánské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDAXYZNBZRMFEJ2SGMKR": {
      "id": "pcat_01KJ8PKDAXYZNBZRMFEJ2SGMKR",
      "name": "Kulichy",
      "handle": "kulichy-category-112",
      "description": "Pánské zimní kulichy",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDF7GRYW1XJPX1Q213SN": {
      "id": "pcat_01KJ8PKDF7GRYW1XJPX1Q213SN",
      "name": "Ski",
      "handle": "ski",
      "description": "Pánské vybavení pro lyžaře",
      "parent_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S": {
      "id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "name": "Oblečení",
      "handle": "obleceni-category-120",
      "description": "Pánské zimní oblečení",
      "parent_category_id": "pcat_01KJ8PKDF7GRYW1XJPX1Q213SN",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDGJ7B5SZTMQ369N2GB7": {
      "id": "pcat_01KJ8PKDGJ7B5SZTMQ369N2GB7",
      "name": "Bundy",
      "handle": "bundy-category-121",
      "description": "Pánské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDH5KBW0TRMZA7WCDCTH": {
      "id": "pcat_01KJ8PKDH5KBW0TRMZA7WCDCTH",
      "name": "Kalhoty",
      "handle": "kalhoty-category-122",
      "description": "Pánské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDHRPJNQD62FA6007MEZ": {
      "id": "pcat_01KJ8PKDHRPJNQD62FA6007MEZ",
      "name": "Rukavice",
      "handle": "rukavice-category-123",
      "description": "Pánské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDJCGGP5EG5EJR5FHNXB": {
      "id": "pcat_01KJ8PKDJCGGP5EG5EJR5FHNXB",
      "name": "Kulichy",
      "handle": "kulichy-category-124",
      "description": "Pánské zimní kulichy",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDKJEVYBRJCSM5H1M477": {
      "id": "pcat_01KJ8PKDKJEVYBRJCSM5H1M477",
      "name": "Doplňky",
      "handle": "doplnky-category-126",
      "description": "Pánské zimní doplňky",
      "parent_category_id": "pcat_01KJ8PKDF7GRYW1XJPX1Q213SN",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDPKJ4EMQ3YSG8NN33T2": {
      "id": "pcat_01KJ8PKDPKJ4EMQ3YSG8NN33T2",
      "name": "Batohy",
      "handle": "batohy",
      "description": "Pánské batohy",
      "parent_category_id": "pcat_01KJ8PKDKJEVYBRJCSM5H1M477",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDQ7YJQKY9BYZJA0CNCC": {
      "id": "pcat_01KJ8PKDQ7YJQKY9BYZJA0CNCC",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-132",
      "description": "Pánské sluneční brýle",
      "parent_category_id": "pcat_01KJ8PKDKJEVYBRJCSM5H1M477",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX": {
      "id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "name": "Dámské",
      "handle": "damske",
      "parent_category_id": null,
      "root_category_id": null
    },
    "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C": {
      "id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "name": "Oblečení",
      "handle": "obleceni-category-134",
      "description": "Dámské oblečení",
      "parent_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1": {
      "id": "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka-category-135",
      "description": "Dámská trika a tílka",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDSMK7WQH7HF7TCA2P1Z": {
      "id": "pcat_01KJ8PKDSMK7WQH7HF7TCA2P1Z",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy-category-136",
      "description": "Dámská trika s krátkými rukávy",
      "parent_category_id": "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDT8WKYYAN9E647MK9TB": {
      "id": "pcat_01KJ8PKDT8WKYYAN9E647MK9TB",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy-category-137",
      "description": "Dámská trika s dlouhými rukávy",
      "parent_category_id": "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN": {
      "id": "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN",
      "name": "Mikiny",
      "handle": "mikiny-category-138",
      "description": "Dámské mikiny",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDVEE8HTXZE24AQP18HB": {
      "id": "pcat_01KJ8PKDVEE8HTXZE24AQP18HB",
      "name": "Na zip",
      "handle": "na-zip-category-139",
      "description": "Dámské mikiny na zip",
      "parent_category_id": "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDW02AYTTAXHH9ZW9AEK": {
      "id": "pcat_01KJ8PKDW02AYTTAXHH9ZW9AEK",
      "name": "Přes hlavu",
      "handle": "pres-hlavu-category-140",
      "description": "Dámské mikiny přes hlavu",
      "parent_category_id": "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69": {
      "id": "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69",
      "name": "Bundy",
      "handle": "bundy-category-141",
      "description": "Dámské bundy",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDX7CTTRWFV0PWXEHXM9": {
      "id": "pcat_01KJ8PKDX7CTTRWFV0PWXEHXM9",
      "name": "Street",
      "handle": "street-category-142",
      "description": "Dámské bundy pro volný čas",
      "parent_category_id": "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDXTMMHKQZH5AMNN0HAZ": {
      "id": "pcat_01KJ8PKDXTMMHKQZH5AMNN0HAZ",
      "name": "Zimní",
      "handle": "zimni-category-143",
      "description": "Dámské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDYBF7VBS3QWS82EHAA0": {
      "id": "pcat_01KJ8PKDYBF7VBS3QWS82EHAA0",
      "name": "Svetry",
      "handle": "svetry-category-144",
      "description": "Dámské svetry",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDYXYBTRCFBWTBHG4X2P": {
      "id": "pcat_01KJ8PKDYXYBTRCFBWTBHG4X2P",
      "name": "Košile",
      "handle": "kosile-category-145",
      "description": "Dámské košile",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF": {
      "id": "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF",
      "name": "Kalhoty",
      "handle": "kalhoty-category-146",
      "description": "Dámské kalhoty",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE04YTC6CTPPWD4V7CC0": {
      "id": "pcat_01KJ8PKE04YTC6CTPPWD4V7CC0",
      "name": "Street",
      "handle": "street-category-147",
      "description": "Dámské kalhoty pro volný čas",
      "parent_category_id": "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE0P7SJA4RE6P2ZGDJS5": {
      "id": "pcat_01KJ8PKE0P7SJA4RE6P2ZGDJS5",
      "name": "Zimní",
      "handle": "zimni-category-148",
      "description": "Dámské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE1A8HKD0KD1X93E2D2Q": {
      "id": "pcat_01KJ8PKE1A8HKD0KD1X93E2D2Q",
      "name": "Kraťasy",
      "handle": "kratasy-category-149",
      "description": "Dámské šortky",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE1WK0P5R8QZ9A0GPJ4H": {
      "id": "pcat_01KJ8PKE1WK0P5R8QZ9A0GPJ4H",
      "name": "Plavky",
      "handle": "plavky-category-150",
      "description": "Dámské plavky",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE2GFYNJ8X08GYT4YB72": {
      "id": "pcat_01KJ8PKE2GFYNJ8X08GYT4YB72",
      "name": "Šaty a sukně",
      "handle": "saty-a-sukne",
      "description": "Dámské šaty a sukně",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE33CYQEQV5JBQ189HZR": {
      "id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "name": "Doplňky",
      "handle": "doplnky-category-152",
      "description": "Dámské doplňky",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE3Q21Y0VX42H84AJ2QG": {
      "id": "pcat_01KJ8PKE3Q21Y0VX42H84AJ2QG",
      "name": "Boty",
      "handle": "boty-category-153",
      "description": "Dámské boty",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE4RSKFXVETYZ9ZQBA8X": {
      "id": "pcat_01KJ8PKE4RSKFXVETYZ9ZQBA8X",
      "name": "Žabky",
      "handle": "zabky-category-155",
      "description": "Dámské žabky a sandály",
      "parent_category_id": "pcat_01KJ8PKE3Q21Y0VX42H84AJ2QG",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE5AAZNY9DYKNR9PFY8Z": {
      "id": "pcat_01KJ8PKE5AAZNY9DYKNR9PFY8Z",
      "name": "Kulichy",
      "handle": "kulichy-category-156",
      "description": "Dámské kulichy",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE5Z6M3SAAXNEMPC7QAY": {
      "id": "pcat_01KJ8PKE5Z6M3SAAXNEMPC7QAY",
      "name": "Kšiltovky",
      "handle": "ksiltovky-category-157",
      "description": "Dámské kšiltovky",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE6JFP7VRGN5TXG41Q3D": {
      "id": "pcat_01KJ8PKE6JFP7VRGN5TXG41Q3D",
      "name": "Tašky a batohy",
      "handle": "tasky-a-batohy-category-158",
      "description": "Dámské batohy a kabelky",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE750FPSXTC40E6GEVVZ": {
      "id": "pcat_01KJ8PKE750FPSXTC40E6GEVVZ",
      "name": "Rukavice",
      "handle": "rukavice-category-159",
      "description": "Dámské rukavice",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE7SY3X2K56VR3QX0VXA": {
      "id": "pcat_01KJ8PKE7SY3X2K56VR3QX0VXA",
      "name": "Ponožky",
      "handle": "ponozky-category-160",
      "description": "Dámské ponožky",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKE9JNC8TQXGRMRQCJ72S": {
      "id": "pcat_01KJ8PKE9JNC8TQXGRMRQCJ72S",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-163",
      "description": "Dámské sluneční brýle",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEA4WRS4SFY5WEE75F31": {
      "id": "pcat_01KJ8PKEA4WRS4SFY5WEE75F31",
      "name": "Ostatní",
      "handle": "ostatni-category-164",
      "description": "Ostatní doplňky",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEAQ9Q4MQ855WA3HP4PX": {
      "id": "pcat_01KJ8PKEAQ9Q4MQ855WA3HP4PX",
      "name": "Cyklo",
      "handle": "cyklo-category-165",
      "description": "Dámská cyklistika",
      "parent_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEBA9MWK89QVA8SY3X62": {
      "id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "name": "Oblečení",
      "handle": "obleceni-category-166",
      "description": "Dámské cyklo oblečení",
      "parent_category_id": "pcat_01KJ8PKEAQ9Q4MQ855WA3HP4PX",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEDPACRC4KVVZMBK36YR": {
      "id": "pcat_01KJ8PKEDPACRC4KVVZMBK36YR",
      "name": "Bundy",
      "handle": "bundy-category-170",
      "description": "Dámské cyklo bundy",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF": {
      "id": "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF",
      "name": "Kraťasy",
      "handle": "kratasy-category-174",
      "description": "Dámské cyklo kraťasy",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEGN4BGAD2XNQ6R5YMTS": {
      "id": "pcat_01KJ8PKEGN4BGAD2XNQ6R5YMTS",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne-category-175",
      "description": "Dámské cyklo šortky volné",
      "parent_category_id": "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEH8NJY4EF960YDTSRMK": {
      "id": "pcat_01KJ8PKEH8NJY4EF960YDTSRMK",
      "name": "Bib (elastické)",
      "handle": "bib-elasticke-category-176",
      "description": "Dámské cyklo šortky elastické",
      "parent_category_id": "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC": {
      "id": "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC",
      "name": "Rukavice",
      "handle": "rukavice-category-177",
      "description": "Dámské cyklo rukavice",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEJF85E0H2699F97QJSF": {
      "id": "pcat_01KJ8PKEJF85E0H2699F97QJSF",
      "name": "Dlouhé",
      "handle": "dlouhe-category-178",
      "description": "Dámské cyklo rukavice dlouhé",
      "parent_category_id": "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEK1XZE4JMCDPVRE0TE2": {
      "id": "pcat_01KJ8PKEK1XZE4JMCDPVRE0TE2",
      "name": "Krátké",
      "handle": "kratke-category-179",
      "description": "Dámské cyklo rukavice krátké",
      "parent_category_id": "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEM80WSC8TEMG37WGMQN": {
      "id": "pcat_01KJ8PKEM80WSC8TEMG37WGMQN",
      "name": "Ponožky",
      "handle": "ponozky-category-181",
      "description": "Dámské cyklo ponožky",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKENZ76HRFF74CZMH2ZQR": {
      "id": "pcat_01KJ8PKENZ76HRFF74CZMH2ZQR",
      "name": "Doplňky",
      "handle": "doplnky-category-184",
      "description": "Dámské cyklo doplňky",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKEQR622TN6S0F4AJRFGY": {
      "id": "pcat_01KJ8PKEQR622TN6S0F4AJRFGY",
      "name": "Ostatní",
      "handle": "ostatni-category-187",
      "description": "Ostatní doplňky",
      "parent_category_id": "pcat_01KJ8PKENZ76HRFF74CZMH2ZQR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKFJYS429F3WQPNRBM592": {
      "id": "pcat_01KJ8PKFJYS429F3WQPNRBM592",
      "name": "Snb-Skate",
      "handle": "snb-skate-category-233",
      "description": "Dámský snowboarding a skateboarding",
      "parent_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD": {
      "id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "name": "Snowboarding",
      "handle": "snowboarding-category-234",
      "description": "Dámský snowboarding",
      "parent_category_id": "pcat_01KJ8PKFJYS429F3WQPNRBM592",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKFQ5H7RWNYFMZ5JX5ZZQ": {
      "id": "pcat_01KJ8PKFQ5H7RWNYFMZ5JX5ZZQ",
      "name": "Bundy",
      "handle": "bundy-category-240",
      "description": "Dámské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKFQSZWVQPAGQKZW3ZEG7": {
      "id": "pcat_01KJ8PKFQSZWVQPAGQKZW3ZEG7",
      "name": "Kalhoty",
      "handle": "kalhoty-category-241",
      "description": "Dámské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKFRBV6F8SXQ2GWA5F2H0": {
      "id": "pcat_01KJ8PKFRBV6F8SXQ2GWA5F2H0",
      "name": "Rukavice",
      "handle": "rukavice-category-242",
      "description": "Dámské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKFRX7W1T0V6747MEPJ1M": {
      "id": "pcat_01KJ8PKFRX7W1T0V6747MEPJ1M",
      "name": "Kulichy",
      "handle": "kulichy-category-243",
      "description": "Dámské zimní kulichy",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKFXSKR8Y1QTDD50YZJ7W": {
      "id": "pcat_01KJ8PKFXSKR8Y1QTDD50YZJ7W",
      "name": "Ski",
      "handle": "ski-category-251",
      "description": "Dámské vybavení pro lyžaře",
      "parent_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKFYEP3054YN2N31H1FS6": {
      "id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "name": "Oblečení",
      "handle": "obleceni-category-252",
      "description": "Dámské zimní oblečení",
      "parent_category_id": "pcat_01KJ8PKFXSKR8Y1QTDD50YZJ7W",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKFZ0SV466C80AFMRDATX": {
      "id": "pcat_01KJ8PKFZ0SV466C80AFMRDATX",
      "name": "Bundy",
      "handle": "bundy-category-253",
      "description": "Dámské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKFZJKENVZY7TDYGNEFDS": {
      "id": "pcat_01KJ8PKFZJKENVZY7TDYGNEFDS",
      "name": "Kalhoty",
      "handle": "kalhoty-category-254",
      "description": "Dámské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKG05YY9B27TVAQ0REDR1": {
      "id": "pcat_01KJ8PKG05YY9B27TVAQ0REDR1",
      "name": "Rukavice",
      "handle": "rukavice-category-255",
      "description": "Dámské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKG0RX28P2Y3N8JMFNHNB": {
      "id": "pcat_01KJ8PKG0RX28P2Y3N8JMFNHNB",
      "name": "Kulichy",
      "handle": "kulichy-category-256",
      "description": "Dámské zimní kulichy",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKG1Z91DC7Z9PAWKPAN1S": {
      "id": "pcat_01KJ8PKG1Z91DC7Z9PAWKPAN1S",
      "name": "Doplňky",
      "handle": "doplnky-category-258",
      "description": "Dámské zimní doplňky",
      "parent_category_id": "pcat_01KJ8PKFXSKR8Y1QTDD50YZJ7W",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKG4WM2WFJ69M1Q48232H": {
      "id": "pcat_01KJ8PKG4WM2WFJ69M1Q48232H",
      "name": "Batohy",
      "handle": "batohy-category-263",
      "description": "Dámské batohy",
      "parent_category_id": "pcat_01KJ8PKG1Z91DC7Z9PAWKPAN1S",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKG5GVKN7BY46PXPAM9RQ": {
      "id": "pcat_01KJ8PKG5GVKN7BY46PXPAM9RQ",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-264",
      "description": "Dámské sluneční brýle",
      "parent_category_id": "pcat_01KJ8PKG1Z91DC7Z9PAWKPAN1S",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ": {
      "id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ",
      "name": "Dětské",
      "handle": "detske",
      "parent_category_id": null,
      "root_category_id": null
    },
    "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16": {
      "id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "name": "Oblečení",
      "handle": "obleceni-category-266",
      "description": "Dětské oblečení",
      "parent_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC": {
      "id": "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka-category-267",
      "description": "Dětská trička",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKG7W9GNZGTH519V2XBPD": {
      "id": "pcat_01KJ8PKG7W9GNZGTH519V2XBPD",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy-category-268",
      "description": "Dětská trička s krátkými rukávy",
      "parent_category_id": "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKG8GFS2ZP46MAC43YT2Y": {
      "id": "pcat_01KJ8PKG8GFS2ZP46MAC43YT2Y",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy-category-269",
      "description": "Dětská trička s dlouhými rukávy",
      "parent_category_id": "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKG94N4CVM36AGYYQ58MS": {
      "id": "pcat_01KJ8PKG94N4CVM36AGYYQ58MS",
      "name": "Mikiny",
      "handle": "mikiny-category-270",
      "description": "Dětské mikiny",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGA862SWXQ8ZEB95TPBQ": {
      "id": "pcat_01KJ8PKGA862SWXQ8ZEB95TPBQ",
      "name": "Přes hlavu",
      "handle": "pres-hlavu-category-272",
      "description": "Dětské mikiny přes hlavu",
      "parent_category_id": "pcat_01KJ8PKG94N4CVM36AGYYQ58MS",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R": {
      "id": "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R",
      "name": "Bundy",
      "handle": "bundy-category-273",
      "description": "Dětské bundy",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGBACMHZ81KDHZP49B5H": {
      "id": "pcat_01KJ8PKGBACMHZ81KDHZP49B5H",
      "name": "Street",
      "handle": "street-category-274",
      "description": "Dětské bundy pro volný čas",
      "parent_category_id": "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGBXH1Q6QF0NH617TNF6": {
      "id": "pcat_01KJ8PKGBXH1Q6QF0NH617TNF6",
      "name": "Zimní",
      "handle": "zimni-category-275",
      "description": "Dětské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF": {
      "id": "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF",
      "name": "Kalhoty",
      "handle": "kalhoty-category-276",
      "description": "Dětské kalhoty",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGD13CP39WJJX3H2X3KS": {
      "id": "pcat_01KJ8PKGD13CP39WJJX3H2X3KS",
      "name": "Street",
      "handle": "street-category-277",
      "description": "Dětské kalhoty pro volný čas",
      "parent_category_id": "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGDJPHS3TZMYXQZY82T9": {
      "id": "pcat_01KJ8PKGDJPHS3TZMYXQZY82T9",
      "name": "Zimní",
      "handle": "zimni-category-278",
      "description": "Dětské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGE4DN810TW15BFM636Q": {
      "id": "pcat_01KJ8PKGE4DN810TW15BFM636Q",
      "name": "Kraťasy",
      "handle": "kratasy-category-279",
      "description": "Dětské kraťasy",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGEQGWTBJ0JD0J1GC1PB": {
      "id": "pcat_01KJ8PKGEQGWTBJ0JD0J1GC1PB",
      "name": "Plavky",
      "handle": "plavky-category-280",
      "description": "Dětské plavky",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGFSE322B5RQWA4VM2A3": {
      "id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "name": "Doplňky",
      "handle": "doplnky-category-281",
      "description": "Dětské doplňky",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGGHSEVR2Q7HNSRM3A1S": {
      "id": "pcat_01KJ8PKGGHSEVR2Q7HNSRM3A1S",
      "name": "Boty",
      "handle": "boty-category-282",
      "description": "Dětské boty",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGH3RS1WN6V7APCDK4ZB": {
      "id": "pcat_01KJ8PKGH3RS1WN6V7APCDK4ZB",
      "name": "Kulichy",
      "handle": "kulichy-category-283",
      "description": "Dětské kulichy",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGHSJQZ2VD48WBXQRCGK": {
      "id": "pcat_01KJ8PKGHSJQZ2VD48WBXQRCGK",
      "name": "Kšiltovky",
      "handle": "ksiltovky-category-284",
      "description": "Dětské kšiltovky",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGJCHAQ44ZGKC34H2RDJ": {
      "id": "pcat_01KJ8PKGJCHAQ44ZGKC34H2RDJ",
      "name": "Rukavice",
      "handle": "rukavice-category-285",
      "description": "Dětské rukavice",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKGKHHE9RN9KZWN2T4CPV": {
      "id": "pcat_01KJ8PKGKHHE9RN9KZWN2T4CPV",
      "name": "Ostatní",
      "handle": "ostatni-category-287",
      "description": "Ostatní doplňky",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKH8KTCTHDHNH3RJ5017R": {
      "id": "pcat_01KJ8PKH8KTCTHDHNH3RJ5017R",
      "name": "Snb-Skate",
      "handle": "snb-skate-category-323",
      "description": "Dětský skateboarding a snowboarding",
      "parent_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKH95DS3VYST2SEBQRQB4": {
      "id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "name": "Snowboarding",
      "handle": "snowboarding-category-324",
      "description": "Dětský snowboarding",
      "parent_category_id": "pcat_01KJ8PKH8KTCTHDHNH3RJ5017R",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKHCP48HR09RTZ666F0V2": {
      "id": "pcat_01KJ8PKHCP48HR09RTZ666F0V2",
      "name": "Bundy",
      "handle": "bundy-category-330",
      "description": "Dětské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKHDD1MVBVHQYPNEXRRNG": {
      "id": "pcat_01KJ8PKHDD1MVBVHQYPNEXRRNG",
      "name": "Kalhoty",
      "handle": "kalhoty-category-331",
      "description": "Dětské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKHE02GQBSXMWMJK708W9": {
      "id": "pcat_01KJ8PKHE02GQBSXMWMJK708W9",
      "name": "Rukavice",
      "handle": "rukavice-category-332",
      "description": "Dětské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKHEMW74614FCQBC87ND0": {
      "id": "pcat_01KJ8PKHEMW74614FCQBC87ND0",
      "name": "Kulichy",
      "handle": "kulichy-category-333",
      "description": "Dětské kulichy",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKHGA633P51YAMQ2VQCE6": {
      "id": "pcat_01KJ8PKHGA633P51YAMQ2VQCE6",
      "name": "Ski",
      "handle": "ski-category-336",
      "description": "Dětské vybavení pro lyžaře",
      "parent_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKHH1NW9B33VCTG13FHX1": {
      "id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "name": "Oblečení",
      "handle": "obleceni-category-337",
      "description": "Dětské zimní oblečení",
      "parent_category_id": "pcat_01KJ8PKHGA633P51YAMQ2VQCE6",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKHHPW3FDJP0BABT512ZR": {
      "id": "pcat_01KJ8PKHHPW3FDJP0BABT512ZR",
      "name": "Bundy",
      "handle": "bundy-category-338",
      "description": "Dětské zimní bundy",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKHJ78Y321ARYY6EMJKF2": {
      "id": "pcat_01KJ8PKHJ78Y321ARYY6EMJKF2",
      "name": "Kalhoty",
      "handle": "kalhoty-category-339",
      "description": "Dětské zimní kalhoty",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKHJVW0D8DSK4BTPZF4FB": {
      "id": "pcat_01KJ8PKHJVW0D8DSK4BTPZF4FB",
      "name": "Rukavice",
      "handle": "rukavice-category-340",
      "description": "Dětské zimní rukavice",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKHKGJ79BMBMR3Q47AAXD": {
      "id": "pcat_01KJ8PKHKGJ79BMBMR3Q47AAXD",
      "name": "Kulichy",
      "handle": "kulichy-category-341",
      "description": "Dětské zimní kulichy",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    "pcat_01KJ8PKHQB2B245D110Q7K7NSS": {
      "id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "name": "Oblečení",
      "handle": "obleceni-category-347",
      "parent_category_id": null,
      "root_category_id": null
    },
    "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS": {
      "id": "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka-category-348",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHRJYETYMS5BZ64WA2J9": {
      "id": "pcat_01KJ8PKHRJYETYMS5BZ64WA2J9",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy-category-349",
      "description": "Trika s krátkými rukávy",
      "parent_category_id": "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHS5AXX226EDC4NQ9PRR": {
      "id": "pcat_01KJ8PKHS5AXX226EDC4NQ9PRR",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy-category-350",
      "description": "Trika s dlouhými rukávy",
      "parent_category_id": "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP": {
      "id": "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP",
      "name": "Mikiny",
      "handle": "mikiny-category-351",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHTESRFQACFAASYQ4S7V": {
      "id": "pcat_01KJ8PKHTESRFQACFAASYQ4S7V",
      "name": "Na zip",
      "handle": "na-zip-category-352",
      "description": "Mikiny na zip",
      "parent_category_id": "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHV1J6P2ZW8D851DCR2F": {
      "id": "pcat_01KJ8PKHV1J6P2ZW8D851DCR2F",
      "name": "Přes hlavu",
      "handle": "pres-hlavu-category-353",
      "description": "Mikiny přes hlavu",
      "parent_category_id": "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV": {
      "id": "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV",
      "name": "Bundy",
      "handle": "bundy-category-354",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHW9GM84V9EV1DCEJJNQ": {
      "id": "pcat_01KJ8PKHW9GM84V9EV1DCEJJNQ",
      "name": "Street",
      "handle": "street-category-355",
      "parent_category_id": "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHX3C06P46Q96Q0M8V2T": {
      "id": "pcat_01KJ8PKHX3C06P46Q96Q0M8V2T",
      "name": "Zimní",
      "handle": "zimni-category-356",
      "parent_category_id": "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHXPNMHEXJQ67J66X6RV": {
      "id": "pcat_01KJ8PKHXPNMHEXJQ67J66X6RV",
      "name": "Svetry",
      "handle": "svetry-category-357",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHYF5Q2A0FHZ8CRSBVVB": {
      "id": "pcat_01KJ8PKHYF5Q2A0FHZ8CRSBVVB",
      "name": "Košile",
      "handle": "kosile-category-358",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53": {
      "id": "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53",
      "name": "Kalhoty",
      "handle": "kalhoty-category-359",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKHZNFQ4QJ0K1FM2NF3V2": {
      "id": "pcat_01KJ8PKHZNFQ4QJ0K1FM2NF3V2",
      "name": "Street",
      "handle": "street-category-360",
      "parent_category_id": "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ09JNYFDMFYZV5TE74B": {
      "id": "pcat_01KJ8PKJ09JNYFDMFYZV5TE74B",
      "name": "Zimní",
      "handle": "zimni-category-361",
      "parent_category_id": "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ0VQTC9NZ7NDA67EGMV": {
      "id": "pcat_01KJ8PKJ0VQTC9NZ7NDA67EGMV",
      "name": "Kraťasy",
      "handle": "kratasy-category-362",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ1C6KY3GCWE83M7TSSZ": {
      "id": "pcat_01KJ8PKJ1C6KY3GCWE83M7TSSZ",
      "name": "Plavky",
      "handle": "plavky-category-363",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT": {
      "id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "name": "Doplňky",
      "handle": "doplnky-category-364",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR": {
      "id": "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR",
      "name": "Boty",
      "handle": "boty-category-365",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ38TPV1S2YCHB1VKJC9": {
      "id": "pcat_01KJ8PKJ38TPV1S2YCHB1VKJC9",
      "name": "Street",
      "handle": "street-category-366",
      "parent_category_id": "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ3TAS6DQX44XBHSCW3D": {
      "id": "pcat_01KJ8PKJ3TAS6DQX44XBHSCW3D",
      "name": "Žabky",
      "handle": "zabky-category-367",
      "parent_category_id": "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ4CHHBV92JWAWJ2HETC": {
      "id": "pcat_01KJ8PKJ4CHHBV92JWAWJ2HETC",
      "name": "Kulichy",
      "handle": "kulichy-category-368",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ51S295GB4HXMHF9H4A": {
      "id": "pcat_01KJ8PKJ51S295GB4HXMHF9H4A",
      "name": "Kšiltovky",
      "handle": "ksiltovky-category-369",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ5N1HPW788N46X2B0V2": {
      "id": "pcat_01KJ8PKJ5N1HPW788N46X2B0V2",
      "name": "Tašky a batohy",
      "handle": "tasky-a-batohy-category-370",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ68NYGXN86WGKTBR1PQ": {
      "id": "pcat_01KJ8PKJ68NYGXN86WGKTBR1PQ",
      "name": "Rukavice",
      "handle": "rukavice-category-371",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ6SMMSJC6JCBN0KYN1Y": {
      "id": "pcat_01KJ8PKJ6SMMSJC6JCBN0KYN1Y",
      "name": "Ponožky",
      "handle": "ponozky-category-372",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ7CEYWGM0MWGBSGZQP3": {
      "id": "pcat_01KJ8PKJ7CEYWGM0MWGBSGZQP3",
      "name": "Pásky",
      "handle": "pasky-category-373",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ7ZBAEGN539400PHX27": {
      "id": "pcat_01KJ8PKJ7ZBAEGN539400PHX27",
      "name": "Peněženky",
      "handle": "penezenky-category-374",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ8J6DQKVJKGN8VF5EP6": {
      "id": "pcat_01KJ8PKJ8J6DQKVJKGN8VF5EP6",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-375",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ95C4T5FMQS8YZ3FNED": {
      "id": "pcat_01KJ8PKJ95C4T5FMQS8YZ3FNED",
      "name": "Ostatní",
      "handle": "ostatni-category-376",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJ9RXMV1D6BR1TQFZ4HP": {
      "id": "pcat_01KJ8PKJ9RXMV1D6BR1TQFZ4HP",
      "name": "Šaty a sukně",
      "handle": "saty-a-sukne-category-377",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR": {
      "id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR",
      "name": "Cyklo",
      "handle": "cyklo-category-378",
      "parent_category_id": null,
      "root_category_id": null
    },
    "pcat_01KJ8PKJAXA9SC28N04Y5F1655": {
      "id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "name": "Oblečení",
      "handle": "obleceni-category-379",
      "parent_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJD5YCBMXQ19HC5D3H4Z": {
      "id": "pcat_01KJ8PKJD5YCBMXQ19HC5D3H4Z",
      "name": "Bundy",
      "handle": "bundy-category-383",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJDR9GD9YZYA8873JSZP": {
      "id": "pcat_01KJ8PKJDR9GD9YZYA8873JSZP",
      "name": "Kalhoty",
      "handle": "kalhoty-category-384",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJE9N6789BMXX845JAQW": {
      "id": "pcat_01KJ8PKJE9N6789BMXX845JAQW",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne-category-385",
      "parent_category_id": "pcat_01KJ8PKJDR9GD9YZYA8873JSZP",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3": {
      "id": "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3",
      "name": "Kraťasy",
      "handle": "kratasy-category-387",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJG5NQMBAK24CYDAT9NZ": {
      "id": "pcat_01KJ8PKJG5NQMBAK24CYDAT9NZ",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne-category-388",
      "parent_category_id": "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJGQDDNVQVH92VNY8PB2": {
      "id": "pcat_01KJ8PKJGQDDNVQVH92VNY8PB2",
      "name": "Bib (elastické)",
      "handle": "bib-elasticke-category-389",
      "parent_category_id": "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME": {
      "id": "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME",
      "name": "Rukavice",
      "handle": "rukavice-category-390",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJJ0RQGDCSB7DJ24G1WA": {
      "id": "pcat_01KJ8PKJJ0RQGDCSB7DJ24G1WA",
      "name": "Dlouhé",
      "handle": "dlouhe-category-391",
      "parent_category_id": "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJJQHWXQQ7QZ7S2165DE": {
      "id": "pcat_01KJ8PKJJQHWXQQ7QZ7S2165DE",
      "name": "Krátké",
      "handle": "kratke-category-392",
      "parent_category_id": "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJKV5F90D18BN594S9X7": {
      "id": "pcat_01KJ8PKJKV5F90D18BN594S9X7",
      "name": "Ponožky",
      "handle": "ponozky-category-394",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJNHWTNE9QGMEXB8HR4V": {
      "id": "pcat_01KJ8PKJNHWTNE9QGMEXB8HR4V",
      "name": "Doplňky",
      "handle": "doplnky-category-397",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKJQH8013X22SDFEGVDX7": {
      "id": "pcat_01KJ8PKJQH8013X22SDFEGVDX7",
      "name": "Ostatní",
      "handle": "ostatni-category-400",
      "parent_category_id": "pcat_01KJ8PKJNHWTNE9QGMEXB8HR4V",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y": {
      "id": "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y",
      "name": "Moto",
      "handle": "moto-category-424",
      "parent_category_id": null,
      "root_category_id": null
    },
    "pcat_01KJ8PKKJ51ND9ETH4HVYVA48K": {
      "id": "pcat_01KJ8PKKJ51ND9ETH4HVYVA48K",
      "name": "Doplňky",
      "handle": "doplnky-category-444",
      "parent_category_id": "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y",
      "root_category_id": "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y"
    },
    "pcat_01KJ8PKKK9HE68GJ665VWWC19Q": {
      "id": "pcat_01KJ8PKKK9HE68GJ665VWWC19Q",
      "name": "Ostatní",
      "handle": "ostatni-category-446",
      "parent_category_id": "pcat_01KJ8PKKJ51ND9ETH4HVYVA48K",
      "root_category_id": "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y"
    },
    "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS": {
      "id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS",
      "name": "Snb-Skate",
      "handle": "snb-skate-category-448",
      "parent_category_id": null,
      "root_category_id": null
    },
    "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E": {
      "id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "name": "Snowboarding",
      "handle": "snowboarding-category-449",
      "parent_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    "pcat_01KJ8PKKRM26M39A3RNRA3BVGM": {
      "id": "pcat_01KJ8PKKRM26M39A3RNRA3BVGM",
      "name": "Bundy",
      "handle": "bundy-category-455",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    "pcat_01KJ8PKKS6Y9PK6RP5N31SFT2V": {
      "id": "pcat_01KJ8PKKS6Y9PK6RP5N31SFT2V",
      "name": "Kalhoty",
      "handle": "kalhoty-category-456",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    "pcat_01KJ8PKKSR5XFKZ3TAFE8HNQHQ": {
      "id": "pcat_01KJ8PKKSR5XFKZ3TAFE8HNQHQ",
      "name": "Rukavice",
      "handle": "rukavice-category-457",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    "pcat_01KJ8PKKTC44XRRAKGXB9RTHVY": {
      "id": "pcat_01KJ8PKKTC44XRRAKGXB9RTHVY",
      "name": "Kulichy",
      "handle": "kulichy-category-458",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC": {
      "id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC",
      "name": "Ski",
      "handle": "ski-category-466",
      "parent_category_id": null,
      "root_category_id": null
    },
    "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA": {
      "id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "name": "Oblečení",
      "handle": "obleceni-category-467",
      "parent_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    "pcat_01KJ8PKM0A17E98H5KHNZPEJ9P": {
      "id": "pcat_01KJ8PKM0A17E98H5KHNZPEJ9P",
      "name": "Bundy",
      "handle": "bundy-category-468",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    "pcat_01KJ8PKM10ZEHAXH5Y3RYX5VV1": {
      "id": "pcat_01KJ8PKM10ZEHAXH5Y3RYX5VV1",
      "name": "Kalhoty",
      "handle": "kalhoty-category-469",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    "pcat_01KJ8PKM1JY2HW23ENTA4XJ516": {
      "id": "pcat_01KJ8PKM1JY2HW23ENTA4XJ516",
      "name": "Rukavice",
      "handle": "rukavice-category-470",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    "pcat_01KJ8PKM258QYJN6X0BDY6RFVN": {
      "id": "pcat_01KJ8PKM258QYJN6X0BDY6RFVN",
      "name": "Kulichy",
      "handle": "kulichy-category-471",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    "pcat_01KJ8PKM3GHWY8YQSEM3A002VM": {
      "id": "pcat_01KJ8PKM3GHWY8YQSEM3A002VM",
      "name": "Doplňky",
      "handle": "doplnky-category-473",
      "parent_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    "pcat_01KJ8PKM6G2334KB5B65V2A9F3": {
      "id": "pcat_01KJ8PKM6G2334KB5B65V2A9F3",
      "name": "Batohy",
      "handle": "batohy-category-478",
      "parent_category_id": "pcat_01KJ8PKM3GHWY8YQSEM3A002VM",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    "pcat_01KJ8PKM71XV3KJ0E9PQFCDE2Z": {
      "id": "pcat_01KJ8PKM71XV3KJ0E9PQFCDE2Z",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-479",
      "parent_category_id": "pcat_01KJ8PKM3GHWY8YQSEM3A002VM",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    "pcat_01KJ8PKRXA1NHP2S6TEB4HBQVW": {
      "id": "pcat_01KJ8PKRXA1NHP2S6TEB4HBQVW",
      "name": "Náhradní díly",
      "handle": "nahradni-dily-category-728",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    "pcat_01KJ8PKRYHFA0NWW62Y7PH814X": {
      "id": "pcat_01KJ8PKRYHFA0NWW62Y7PH814X",
      "name": "Náhradní díly",
      "handle": "nahradni-dily-category-730",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    "pcat_01KJ8PKTS4FNXT19VJDAPV0JVZ": {
      "id": "pcat_01KJ8PKTS4FNXT19VJDAPV0JVZ",
      "name": "Doplňky",
      "handle": "doplnky-komponenty",
      "parent_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    "pcat_01KJ8PKV221MC1Y78GWBXE0KKK": {
      "id": "pcat_01KJ8PKV221MC1Y78GWBXE0KKK",
      "name": "Lahve",
      "handle": "lahve",
      "parent_category_id": "pcat_01KJ8PKTS4FNXT19VJDAPV0JVZ",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    }
  },
  "leafCategories": [
    {
      "id": "pcat_01KJ8PKBAFQ45DEVPHWEJ0K8CA",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy",
      "parent_category_id": "pcat_01KJ8PKB9YJT7BCWH37BKREH19",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBB3PYWW0Q9QWVJSF1AD",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy",
      "parent_category_id": "pcat_01KJ8PKB9YJT7BCWH37BKREH19",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBCCDG4YJ6FS25GJ4W6V",
      "name": "Na zip",
      "handle": "na-zip",
      "parent_category_id": "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBCWGX9XEC6R6VKTSHV2",
      "name": "Přes hlavu",
      "handle": "pres-hlavu",
      "parent_category_id": "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBE1Q1TEC7914C61Q4XV",
      "name": "Street",
      "handle": "street",
      "parent_category_id": "pcat_01KJ8PKBDDHY0433PSM3TWDJMA",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBEMD43WXY03T267D062",
      "name": "Zimní",
      "handle": "zimni",
      "parent_category_id": "pcat_01KJ8PKBDDHY0433PSM3TWDJMA",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBF94AN5ZM81SBVTJN17",
      "name": "Svetry",
      "handle": "svetry",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBFWH4G7F3V781YEV25W",
      "name": "Košile",
      "handle": "kosile",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBH39QRGT5SW0ARDJHJ9",
      "name": "Street",
      "handle": "street-category-16",
      "parent_category_id": "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBHPRVVHA9RJS5M85K18",
      "name": "Zimní",
      "handle": "zimni-category-17",
      "parent_category_id": "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBJ7F2ZAHRVTFMY0AQVZ",
      "name": "Kraťasy",
      "handle": "kratasy",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBJX8JAK0FY60KQ64MS1",
      "name": "Plavky",
      "handle": "plavky",
      "parent_category_id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBMSNYZWPSAGV2AXBMFV",
      "name": "Street",
      "handle": "street-category-22",
      "parent_category_id": "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBNCXNYR9ZM1PQBF35E7",
      "name": "Žabky",
      "handle": "zabky",
      "parent_category_id": "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBP53BWNA6KA775EERY1",
      "name": "Kulichy",
      "handle": "kulichy",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBPSC6ED4H4T1HX2DYV9",
      "name": "Kšiltovky",
      "handle": "ksiltovky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBQGB8HSYHX6F378EPZK",
      "name": "Tašky a batohy",
      "handle": "tasky-a-batohy",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBR3MQNGYDMBEJGBZJZ7",
      "name": "Rukavice",
      "handle": "rukavice",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBRPK1514T6244GA0WXD",
      "name": "Ponožky",
      "handle": "ponozky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBS7N2FS1CA3S4FKHKD1",
      "name": "Pásky",
      "handle": "pasky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBSWX4E6F6CBATSHTSXX",
      "name": "Peněženky",
      "handle": "penezenky",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBTCFBP4M8RPYS974X6V",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBV4VZWQYMEK133CPS97",
      "name": "Ostatní",
      "handle": "ostatni",
      "parent_category_id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKBZZAQWVQVZMHT1R1G8J",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne",
      "parent_category_id": "pcat_01KJ8PKBZ88RWAZH275FDB0BVC",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKC5A60AHD8Z1E95VX9A4",
      "name": "Ponožky",
      "handle": "ponozky-category-49",
      "parent_category_id": "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKC8VZMPZ31WWKBSZ8JSF",
      "name": "Ostatní",
      "handle": "ostatni-category-55",
      "parent_category_id": "pcat_01KJ8PKC72HXXW8HYVRJKD6HCN",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKD3QWQF33RMRXRPFMBFS",
      "name": "Ostatní",
      "handle": "ostatni-category-100",
      "parent_category_id": "pcat_01KJ8PKD2HB7K8HGF080NG3E18",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKD92RMRM7ZZ514VX0HX5",
      "name": "Bundy",
      "handle": "bundy-category-109",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKD9PYDJKS1ST3SMM3ES9",
      "name": "Kalhoty",
      "handle": "kalhoty-category-110",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDA7QHQYB7S9WB9QH6V6",
      "name": "Rukavice",
      "handle": "rukavice-category-111",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDAXYZNBZRMFEJ2SGMKR",
      "name": "Kulichy",
      "handle": "kulichy-category-112",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKRXA1NHP2S6TEB4HBQVW",
      "name": "Náhradní díly",
      "handle": "nahradni-dily-category-728",
      "parent_category_id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDGJ7B5SZTMQ369N2GB7",
      "name": "Bundy",
      "handle": "bundy-category-121",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDH5KBW0TRMZA7WCDCTH",
      "name": "Kalhoty",
      "handle": "kalhoty-category-122",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDHRPJNQD62FA6007MEZ",
      "name": "Rukavice",
      "handle": "rukavice-category-123",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDJCGGP5EG5EJR5FHNXB",
      "name": "Kulichy",
      "handle": "kulichy-category-124",
      "parent_category_id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDPKJ4EMQ3YSG8NN33T2",
      "name": "Batohy",
      "handle": "batohy",
      "parent_category_id": "pcat_01KJ8PKDKJEVYBRJCSM5H1M477",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDQ7YJQKY9BYZJA0CNCC",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-132",
      "parent_category_id": "pcat_01KJ8PKDKJEVYBRJCSM5H1M477",
      "root_category_id": "pcat_01KJ8PKB8RQ9GC7EN620PXD4C4"
    },
    {
      "id": "pcat_01KJ8PKDSMK7WQH7HF7TCA2P1Z",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy-category-136",
      "parent_category_id": "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDT8WKYYAN9E647MK9TB",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy-category-137",
      "parent_category_id": "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDVEE8HTXZE24AQP18HB",
      "name": "Na zip",
      "handle": "na-zip-category-139",
      "parent_category_id": "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDW02AYTTAXHH9ZW9AEK",
      "name": "Přes hlavu",
      "handle": "pres-hlavu-category-140",
      "parent_category_id": "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDX7CTTRWFV0PWXEHXM9",
      "name": "Street",
      "handle": "street-category-142",
      "parent_category_id": "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDXTMMHKQZH5AMNN0HAZ",
      "name": "Zimní",
      "handle": "zimni-category-143",
      "parent_category_id": "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDYBF7VBS3QWS82EHAA0",
      "name": "Svetry",
      "handle": "svetry-category-144",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKDYXYBTRCFBWTBHG4X2P",
      "name": "Košile",
      "handle": "kosile-category-145",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE04YTC6CTPPWD4V7CC0",
      "name": "Street",
      "handle": "street-category-147",
      "parent_category_id": "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE0P7SJA4RE6P2ZGDJS5",
      "name": "Zimní",
      "handle": "zimni-category-148",
      "parent_category_id": "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE1A8HKD0KD1X93E2D2Q",
      "name": "Kraťasy",
      "handle": "kratasy-category-149",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE1WK0P5R8QZ9A0GPJ4H",
      "name": "Plavky",
      "handle": "plavky-category-150",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE2GFYNJ8X08GYT4YB72",
      "name": "Šaty a sukně",
      "handle": "saty-a-sukne",
      "parent_category_id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE4RSKFXVETYZ9ZQBA8X",
      "name": "Žabky",
      "handle": "zabky-category-155",
      "parent_category_id": "pcat_01KJ8PKE3Q21Y0VX42H84AJ2QG",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE5AAZNY9DYKNR9PFY8Z",
      "name": "Kulichy",
      "handle": "kulichy-category-156",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE5Z6M3SAAXNEMPC7QAY",
      "name": "Kšiltovky",
      "handle": "ksiltovky-category-157",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE6JFP7VRGN5TXG41Q3D",
      "name": "Tašky a batohy",
      "handle": "tasky-a-batohy-category-158",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE750FPSXTC40E6GEVVZ",
      "name": "Rukavice",
      "handle": "rukavice-category-159",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE7SY3X2K56VR3QX0VXA",
      "name": "Ponožky",
      "handle": "ponozky-category-160",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKE9JNC8TQXGRMRQCJ72S",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-163",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEA4WRS4SFY5WEE75F31",
      "name": "Ostatní",
      "handle": "ostatni-category-164",
      "parent_category_id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEDPACRC4KVVZMBK36YR",
      "name": "Bundy",
      "handle": "bundy-category-170",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEGN4BGAD2XNQ6R5YMTS",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne-category-175",
      "parent_category_id": "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEH8NJY4EF960YDTSRMK",
      "name": "Bib (elastické)",
      "handle": "bib-elasticke-category-176",
      "parent_category_id": "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEJF85E0H2699F97QJSF",
      "name": "Dlouhé",
      "handle": "dlouhe-category-178",
      "parent_category_id": "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEK1XZE4JMCDPVRE0TE2",
      "name": "Krátké",
      "handle": "kratke-category-179",
      "parent_category_id": "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEM80WSC8TEMG37WGMQN",
      "name": "Ponožky",
      "handle": "ponozky-category-181",
      "parent_category_id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKEQR622TN6S0F4AJRFGY",
      "name": "Ostatní",
      "handle": "ostatni-category-187",
      "parent_category_id": "pcat_01KJ8PKENZ76HRFF74CZMH2ZQR",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFQ5H7RWNYFMZ5JX5ZZQ",
      "name": "Bundy",
      "handle": "bundy-category-240",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFQSZWVQPAGQKZW3ZEG7",
      "name": "Kalhoty",
      "handle": "kalhoty-category-241",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFRBV6F8SXQ2GWA5F2H0",
      "name": "Rukavice",
      "handle": "rukavice-category-242",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFRX7W1T0V6747MEPJ1M",
      "name": "Kulichy",
      "handle": "kulichy-category-243",
      "parent_category_id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFZ0SV466C80AFMRDATX",
      "name": "Bundy",
      "handle": "bundy-category-253",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKFZJKENVZY7TDYGNEFDS",
      "name": "Kalhoty",
      "handle": "kalhoty-category-254",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKG05YY9B27TVAQ0REDR1",
      "name": "Rukavice",
      "handle": "rukavice-category-255",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKG0RX28P2Y3N8JMFNHNB",
      "name": "Kulichy",
      "handle": "kulichy-category-256",
      "parent_category_id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKG4WM2WFJ69M1Q48232H",
      "name": "Batohy",
      "handle": "batohy-category-263",
      "parent_category_id": "pcat_01KJ8PKG1Z91DC7Z9PAWKPAN1S",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKG5GVKN7BY46PXPAM9RQ",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-264",
      "parent_category_id": "pcat_01KJ8PKG1Z91DC7Z9PAWKPAN1S",
      "root_category_id": "pcat_01KJ8PKDQWA1TBADHC1TX1HQBX"
    },
    {
      "id": "pcat_01KJ8PKG7W9GNZGTH519V2XBPD",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy-category-268",
      "parent_category_id": "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKG8GFS2ZP46MAC43YT2Y",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy-category-269",
      "parent_category_id": "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGA862SWXQ8ZEB95TPBQ",
      "name": "Přes hlavu",
      "handle": "pres-hlavu-category-272",
      "parent_category_id": "pcat_01KJ8PKG94N4CVM36AGYYQ58MS",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGBACMHZ81KDHZP49B5H",
      "name": "Street",
      "handle": "street-category-274",
      "parent_category_id": "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGBXH1Q6QF0NH617TNF6",
      "name": "Zimní",
      "handle": "zimni-category-275",
      "parent_category_id": "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGD13CP39WJJX3H2X3KS",
      "name": "Street",
      "handle": "street-category-277",
      "parent_category_id": "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGDJPHS3TZMYXQZY82T9",
      "name": "Zimní",
      "handle": "zimni-category-278",
      "parent_category_id": "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGE4DN810TW15BFM636Q",
      "name": "Kraťasy",
      "handle": "kratasy-category-279",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGEQGWTBJ0JD0J1GC1PB",
      "name": "Plavky",
      "handle": "plavky-category-280",
      "parent_category_id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGGHSEVR2Q7HNSRM3A1S",
      "name": "Boty",
      "handle": "boty-category-282",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGH3RS1WN6V7APCDK4ZB",
      "name": "Kulichy",
      "handle": "kulichy-category-283",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGHSJQZ2VD48WBXQRCGK",
      "name": "Kšiltovky",
      "handle": "ksiltovky-category-284",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGJCHAQ44ZGKC34H2RDJ",
      "name": "Rukavice",
      "handle": "rukavice-category-285",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKGKHHE9RN9KZWN2T4CPV",
      "name": "Ostatní",
      "handle": "ostatni-category-287",
      "parent_category_id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHCP48HR09RTZ666F0V2",
      "name": "Bundy",
      "handle": "bundy-category-330",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHDD1MVBVHQYPNEXRRNG",
      "name": "Kalhoty",
      "handle": "kalhoty-category-331",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHE02GQBSXMWMJK708W9",
      "name": "Rukavice",
      "handle": "rukavice-category-332",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHEMW74614FCQBC87ND0",
      "name": "Kulichy",
      "handle": "kulichy-category-333",
      "parent_category_id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHHPW3FDJP0BABT512ZR",
      "name": "Bundy",
      "handle": "bundy-category-338",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHJ78Y321ARYY6EMJKF2",
      "name": "Kalhoty",
      "handle": "kalhoty-category-339",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHJVW0D8DSK4BTPZF4FB",
      "name": "Rukavice",
      "handle": "rukavice-category-340",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHKGJ79BMBMR3Q47AAXD",
      "name": "Kulichy",
      "handle": "kulichy-category-341",
      "parent_category_id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "root_category_id": "pcat_01KJ8PKG63RPA9J97QTZWFQ0DQ"
    },
    {
      "id": "pcat_01KJ8PKHRJYETYMS5BZ64WA2J9",
      "name": "Krátké rukávy",
      "handle": "kratke-rukavy-category-349",
      "parent_category_id": "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHS5AXX226EDC4NQ9PRR",
      "name": "Dlouhé rukávy",
      "handle": "dlouhe-rukavy-category-350",
      "parent_category_id": "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHTESRFQACFAASYQ4S7V",
      "name": "Na zip",
      "handle": "na-zip-category-352",
      "parent_category_id": "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHV1J6P2ZW8D851DCR2F",
      "name": "Přes hlavu",
      "handle": "pres-hlavu-category-353",
      "parent_category_id": "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHW9GM84V9EV1DCEJJNQ",
      "name": "Street",
      "handle": "street-category-355",
      "parent_category_id": "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHX3C06P46Q96Q0M8V2T",
      "name": "Zimní",
      "handle": "zimni-category-356",
      "parent_category_id": "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHXPNMHEXJQ67J66X6RV",
      "name": "Svetry",
      "handle": "svetry-category-357",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHYF5Q2A0FHZ8CRSBVVB",
      "name": "Košile",
      "handle": "kosile-category-358",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKHZNFQ4QJ0K1FM2NF3V2",
      "name": "Street",
      "handle": "street-category-360",
      "parent_category_id": "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ09JNYFDMFYZV5TE74B",
      "name": "Zimní",
      "handle": "zimni-category-361",
      "parent_category_id": "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ0VQTC9NZ7NDA67EGMV",
      "name": "Kraťasy",
      "handle": "kratasy-category-362",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ1C6KY3GCWE83M7TSSZ",
      "name": "Plavky",
      "handle": "plavky-category-363",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ38TPV1S2YCHB1VKJC9",
      "name": "Street",
      "handle": "street-category-366",
      "parent_category_id": "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ3TAS6DQX44XBHSCW3D",
      "name": "Žabky",
      "handle": "zabky-category-367",
      "parent_category_id": "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ4CHHBV92JWAWJ2HETC",
      "name": "Kulichy",
      "handle": "kulichy-category-368",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ51S295GB4HXMHF9H4A",
      "name": "Kšiltovky",
      "handle": "ksiltovky-category-369",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ5N1HPW788N46X2B0V2",
      "name": "Tašky a batohy",
      "handle": "tasky-a-batohy-category-370",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ68NYGXN86WGKTBR1PQ",
      "name": "Rukavice",
      "handle": "rukavice-category-371",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ6SMMSJC6JCBN0KYN1Y",
      "name": "Ponožky",
      "handle": "ponozky-category-372",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ7CEYWGM0MWGBSGZQP3",
      "name": "Pásky",
      "handle": "pasky-category-373",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ7ZBAEGN539400PHX27",
      "name": "Peněženky",
      "handle": "penezenky-category-374",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ8J6DQKVJKGN8VF5EP6",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-375",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ95C4T5FMQS8YZ3FNED",
      "name": "Ostatní",
      "handle": "ostatni-category-376",
      "parent_category_id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJ9RXMV1D6BR1TQFZ4HP",
      "name": "Šaty a sukně",
      "handle": "saty-a-sukne-category-377",
      "parent_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "root_category_id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS"
    },
    {
      "id": "pcat_01KJ8PKJD5YCBMXQ19HC5D3H4Z",
      "name": "Bundy",
      "handle": "bundy-category-383",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJE9N6789BMXX845JAQW",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne-category-385",
      "parent_category_id": "pcat_01KJ8PKJDR9GD9YZYA8873JSZP",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJG5NQMBAK24CYDAT9NZ",
      "name": "XC/DH (volné)",
      "handle": "xc-dh-volne-category-388",
      "parent_category_id": "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJGQDDNVQVH92VNY8PB2",
      "name": "Bib (elastické)",
      "handle": "bib-elasticke-category-389",
      "parent_category_id": "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJJ0RQGDCSB7DJ24G1WA",
      "name": "Dlouhé",
      "handle": "dlouhe-category-391",
      "parent_category_id": "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJJQHWXQQ7QZ7S2165DE",
      "name": "Krátké",
      "handle": "kratke-category-392",
      "parent_category_id": "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJKV5F90D18BN594S9X7",
      "name": "Ponožky",
      "handle": "ponozky-category-394",
      "parent_category_id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKJQH8013X22SDFEGVDX7",
      "name": "Ostatní",
      "handle": "ostatni-category-400",
      "parent_category_id": "pcat_01KJ8PKJNHWTNE9QGMEXB8HR4V",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKV221MC1Y78GWBXE0KKK",
      "name": "Lahve",
      "handle": "lahve",
      "parent_category_id": "pcat_01KJ8PKTS4FNXT19VJDAPV0JVZ",
      "root_category_id": "pcat_01KJ8PKJA92K8AZG1WHWQ19DZR"
    },
    {
      "id": "pcat_01KJ8PKKK9HE68GJ665VWWC19Q",
      "name": "Ostatní",
      "handle": "ostatni-category-446",
      "parent_category_id": "pcat_01KJ8PKKJ51ND9ETH4HVYVA48K",
      "root_category_id": "pcat_01KJ8PKK67JDGV3CC08FMBBD5Y"
    },
    {
      "id": "pcat_01KJ8PKKRM26M39A3RNRA3BVGM",
      "name": "Bundy",
      "handle": "bundy-category-455",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    {
      "id": "pcat_01KJ8PKKS6Y9PK6RP5N31SFT2V",
      "name": "Kalhoty",
      "handle": "kalhoty-category-456",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    {
      "id": "pcat_01KJ8PKKSR5XFKZ3TAFE8HNQHQ",
      "name": "Rukavice",
      "handle": "rukavice-category-457",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    {
      "id": "pcat_01KJ8PKKTC44XRRAKGXB9RTHVY",
      "name": "Kulichy",
      "handle": "kulichy-category-458",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    {
      "id": "pcat_01KJ8PKRYHFA0NWW62Y7PH814X",
      "name": "Náhradní díly",
      "handle": "nahradni-dily-category-730",
      "parent_category_id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "root_category_id": "pcat_01KJ8PKKMEWX6EA82WC7N7XMTS"
    },
    {
      "id": "pcat_01KJ8PKM0A17E98H5KHNZPEJ9P",
      "name": "Bundy",
      "handle": "bundy-category-468",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM10ZEHAXH5Y3RYX5VV1",
      "name": "Kalhoty",
      "handle": "kalhoty-category-469",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM1JY2HW23ENTA4XJ516",
      "name": "Rukavice",
      "handle": "rukavice-category-470",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM258QYJN6X0BDY6RFVN",
      "name": "Kulichy",
      "handle": "kulichy-category-471",
      "parent_category_id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM6G2334KB5B65V2A9F3",
      "name": "Batohy",
      "handle": "batohy-category-478",
      "parent_category_id": "pcat_01KJ8PKM3GHWY8YQSEM3A002VM",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    },
    {
      "id": "pcat_01KJ8PKM71XV3KJ0E9PQFCDE2Z",
      "name": "Sluneční brýle",
      "handle": "slunecni-bryle-category-479",
      "parent_category_id": "pcat_01KJ8PKM3GHWY8YQSEM3A002VM",
      "root_category_id": "pcat_01KJ8PKKZ1MZGHHVMVMP9VDKNC"
    }
  ],
  "leafParents": [
    {
      "id": "pcat_01KJ8PKB9CQ855VDE8PKHNWH95",
      "name": "Oblečení",
      "handle": "obleceni",
      "children": [
        "pcat_01KJ8PKB9YJT7BCWH37BKREH19",
        "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS",
        "pcat_01KJ8PKBDDHY0433PSM3TWDJMA",
        "pcat_01KJ8PKBF94AN5ZM81SBVTJN17",
        "pcat_01KJ8PKBFWH4G7F3V781YEV25W",
        "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7",
        "pcat_01KJ8PKBJ7F2ZAHRVTFMY0AQVZ",
        "pcat_01KJ8PKBJX8JAK0FY60KQ64MS1",
        "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH"
      ],
      "leafs": [
        "pcat_01KJ8PKBAFQ45DEVPHWEJ0K8CA",
        "pcat_01KJ8PKBB3PYWW0Q9QWVJSF1AD",
        "pcat_01KJ8PKBCCDG4YJ6FS25GJ4W6V",
        "pcat_01KJ8PKBCWGX9XEC6R6VKTSHV2",
        "pcat_01KJ8PKBE1Q1TEC7914C61Q4XV",
        "pcat_01KJ8PKBEMD43WXY03T267D062",
        "pcat_01KJ8PKBF94AN5ZM81SBVTJN17",
        "pcat_01KJ8PKBFWH4G7F3V781YEV25W",
        "pcat_01KJ8PKBH39QRGT5SW0ARDJHJ9",
        "pcat_01KJ8PKBHPRVVHA9RJS5M85K18",
        "pcat_01KJ8PKBJ7F2ZAHRVTFMY0AQVZ",
        "pcat_01KJ8PKBJX8JAK0FY60KQ64MS1",
        "pcat_01KJ8PKBMSNYZWPSAGV2AXBMFV",
        "pcat_01KJ8PKBNCXNYR9ZM1PQBF35E7",
        "pcat_01KJ8PKBP53BWNA6KA775EERY1",
        "pcat_01KJ8PKBPSC6ED4H4T1HX2DYV9",
        "pcat_01KJ8PKBQGB8HSYHX6F378EPZK",
        "pcat_01KJ8PKBR3MQNGYDMBEJGBZJZ7",
        "pcat_01KJ8PKBRPK1514T6244GA0WXD",
        "pcat_01KJ8PKBS7N2FS1CA3S4FKHKD1",
        "pcat_01KJ8PKBSWX4E6F6CBATSHTSXX",
        "pcat_01KJ8PKBTCFBP4M8RPYS974X6V",
        "pcat_01KJ8PKBV4VZWQYMEK133CPS97"
      ]
    },
    {
      "id": "pcat_01KJ8PKB9YJT7BCWH37BKREH19",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka",
      "children": [
        "pcat_01KJ8PKBAFQ45DEVPHWEJ0K8CA",
        "pcat_01KJ8PKBB3PYWW0Q9QWVJSF1AD"
      ],
      "leafs": [
        "pcat_01KJ8PKBAFQ45DEVPHWEJ0K8CA",
        "pcat_01KJ8PKBB3PYWW0Q9QWVJSF1AD"
      ]
    },
    {
      "id": "pcat_01KJ8PKBBR9K4EMS9YF3MHSDSS",
      "name": "Mikiny",
      "handle": "mikiny",
      "children": [
        "pcat_01KJ8PKBCCDG4YJ6FS25GJ4W6V",
        "pcat_01KJ8PKBCWGX9XEC6R6VKTSHV2"
      ],
      "leafs": [
        "pcat_01KJ8PKBCCDG4YJ6FS25GJ4W6V",
        "pcat_01KJ8PKBCWGX9XEC6R6VKTSHV2"
      ]
    },
    {
      "id": "pcat_01KJ8PKBDDHY0433PSM3TWDJMA",
      "name": "Bundy",
      "handle": "bundy",
      "children": [
        "pcat_01KJ8PKBE1Q1TEC7914C61Q4XV",
        "pcat_01KJ8PKBEMD43WXY03T267D062"
      ],
      "leafs": [
        "pcat_01KJ8PKBE1Q1TEC7914C61Q4XV",
        "pcat_01KJ8PKBEMD43WXY03T267D062"
      ]
    },
    {
      "id": "pcat_01KJ8PKBGGMDWYP3E8FHSE87H7",
      "name": "Kalhoty",
      "handle": "kalhoty",
      "children": [
        "pcat_01KJ8PKBH39QRGT5SW0ARDJHJ9",
        "pcat_01KJ8PKBHPRVVHA9RJS5M85K18"
      ],
      "leafs": [
        "pcat_01KJ8PKBH39QRGT5SW0ARDJHJ9",
        "pcat_01KJ8PKBHPRVVHA9RJS5M85K18"
      ]
    },
    {
      "id": "pcat_01KJ8PKBKG5GBSC7B5QNBN28TH",
      "name": "Doplňky",
      "handle": "doplnky",
      "children": [
        "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K",
        "pcat_01KJ8PKBP53BWNA6KA775EERY1",
        "pcat_01KJ8PKBPSC6ED4H4T1HX2DYV9",
        "pcat_01KJ8PKBQGB8HSYHX6F378EPZK",
        "pcat_01KJ8PKBR3MQNGYDMBEJGBZJZ7",
        "pcat_01KJ8PKBRPK1514T6244GA0WXD",
        "pcat_01KJ8PKBS7N2FS1CA3S4FKHKD1",
        "pcat_01KJ8PKBSWX4E6F6CBATSHTSXX",
        "pcat_01KJ8PKBTCFBP4M8RPYS974X6V",
        "pcat_01KJ8PKBV4VZWQYMEK133CPS97"
      ],
      "leafs": [
        "pcat_01KJ8PKBMSNYZWPSAGV2AXBMFV",
        "pcat_01KJ8PKBNCXNYR9ZM1PQBF35E7",
        "pcat_01KJ8PKBP53BWNA6KA775EERY1",
        "pcat_01KJ8PKBPSC6ED4H4T1HX2DYV9",
        "pcat_01KJ8PKBQGB8HSYHX6F378EPZK",
        "pcat_01KJ8PKBR3MQNGYDMBEJGBZJZ7",
        "pcat_01KJ8PKBRPK1514T6244GA0WXD",
        "pcat_01KJ8PKBS7N2FS1CA3S4FKHKD1",
        "pcat_01KJ8PKBSWX4E6F6CBATSHTSXX",
        "pcat_01KJ8PKBTCFBP4M8RPYS974X6V",
        "pcat_01KJ8PKBV4VZWQYMEK133CPS97"
      ]
    },
    {
      "id": "pcat_01KJ8PKBM3NJDN3CX3W9KKQZ8K",
      "name": "Boty",
      "handle": "boty",
      "children": [
        "pcat_01KJ8PKBMSNYZWPSAGV2AXBMFV",
        "pcat_01KJ8PKBNCXNYR9ZM1PQBF35E7"
      ],
      "leafs": [
        "pcat_01KJ8PKBMSNYZWPSAGV2AXBMFV",
        "pcat_01KJ8PKBNCXNYR9ZM1PQBF35E7"
      ]
    },
    {
      "id": "pcat_01KJ8PKBW7PWYYKNN4C6KW8AV3",
      "name": "Oblečení",
      "handle": "obleceni-category-34",
      "children": [
        "pcat_01KJ8PKBZ88RWAZH275FDB0BVC",
        "pcat_01KJ8PKC5A60AHD8Z1E95VX9A4",
        "pcat_01KJ8PKC72HXXW8HYVRJKD6HCN"
      ],
      "leafs": [
        "pcat_01KJ8PKBZZAQWVQVZMHT1R1G8J",
        "pcat_01KJ8PKC5A60AHD8Z1E95VX9A4",
        "pcat_01KJ8PKC8VZMPZ31WWKBSZ8JSF"
      ]
    },
    {
      "id": "pcat_01KJ8PKBZ88RWAZH275FDB0BVC",
      "name": "Kalhoty",
      "handle": "kalhoty-category-39",
      "children": [
        "pcat_01KJ8PKBZZAQWVQVZMHT1R1G8J"
      ],
      "leafs": [
        "pcat_01KJ8PKBZZAQWVQVZMHT1R1G8J"
      ]
    },
    {
      "id": "pcat_01KJ8PKC72HXXW8HYVRJKD6HCN",
      "name": "Doplňky",
      "handle": "doplnky-category-52",
      "children": [
        "pcat_01KJ8PKC8VZMPZ31WWKBSZ8JSF"
      ],
      "leafs": [
        "pcat_01KJ8PKC8VZMPZ31WWKBSZ8JSF"
      ]
    },
    {
      "id": "pcat_01KJ8PKD2HB7K8HGF080NG3E18",
      "name": "Doplňky",
      "handle": "doplnky-category-98",
      "children": [
        "pcat_01KJ8PKD3QWQF33RMRXRPFMBFS"
      ],
      "leafs": [
        "pcat_01KJ8PKD3QWQF33RMRXRPFMBFS"
      ]
    },
    {
      "id": "pcat_01KJ8PKD5HGDKW7CMCGF2WED7V",
      "name": "Snowboarding",
      "handle": "snowboarding",
      "children": [
        "pcat_01KJ8PKD92RMRM7ZZ514VX0HX5",
        "pcat_01KJ8PKD9PYDJKS1ST3SMM3ES9",
        "pcat_01KJ8PKDA7QHQYB7S9WB9QH6V6",
        "pcat_01KJ8PKDAXYZNBZRMFEJ2SGMKR",
        "pcat_01KJ8PKRXA1NHP2S6TEB4HBQVW"
      ],
      "leafs": [
        "pcat_01KJ8PKD92RMRM7ZZ514VX0HX5",
        "pcat_01KJ8PKD9PYDJKS1ST3SMM3ES9",
        "pcat_01KJ8PKDA7QHQYB7S9WB9QH6V6",
        "pcat_01KJ8PKDAXYZNBZRMFEJ2SGMKR",
        "pcat_01KJ8PKRXA1NHP2S6TEB4HBQVW"
      ]
    },
    {
      "id": "pcat_01KJ8PKDFY4GGSV6N5B7QMG81S",
      "name": "Oblečení",
      "handle": "obleceni-category-120",
      "children": [
        "pcat_01KJ8PKDGJ7B5SZTMQ369N2GB7",
        "pcat_01KJ8PKDH5KBW0TRMZA7WCDCTH",
        "pcat_01KJ8PKDHRPJNQD62FA6007MEZ",
        "pcat_01KJ8PKDJCGGP5EG5EJR5FHNXB"
      ],
      "leafs": [
        "pcat_01KJ8PKDGJ7B5SZTMQ369N2GB7",
        "pcat_01KJ8PKDH5KBW0TRMZA7WCDCTH",
        "pcat_01KJ8PKDHRPJNQD62FA6007MEZ",
        "pcat_01KJ8PKDJCGGP5EG5EJR5FHNXB"
      ]
    },
    {
      "id": "pcat_01KJ8PKDKJEVYBRJCSM5H1M477",
      "name": "Doplňky",
      "handle": "doplnky-category-126",
      "children": [
        "pcat_01KJ8PKDPKJ4EMQ3YSG8NN33T2",
        "pcat_01KJ8PKDQ7YJQKY9BYZJA0CNCC"
      ],
      "leafs": [
        "pcat_01KJ8PKDPKJ4EMQ3YSG8NN33T2",
        "pcat_01KJ8PKDQ7YJQKY9BYZJA0CNCC"
      ]
    },
    {
      "id": "pcat_01KJ8PKDRFKG7Q6WQEYKJHHB5C",
      "name": "Oblečení",
      "handle": "obleceni-category-134",
      "children": [
        "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1",
        "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN",
        "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69",
        "pcat_01KJ8PKDYBF7VBS3QWS82EHAA0",
        "pcat_01KJ8PKDYXYBTRCFBWTBHG4X2P",
        "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF",
        "pcat_01KJ8PKE1A8HKD0KD1X93E2D2Q",
        "pcat_01KJ8PKE1WK0P5R8QZ9A0GPJ4H",
        "pcat_01KJ8PKE2GFYNJ8X08GYT4YB72",
        "pcat_01KJ8PKE33CYQEQV5JBQ189HZR"
      ],
      "leafs": [
        "pcat_01KJ8PKDSMK7WQH7HF7TCA2P1Z",
        "pcat_01KJ8PKDT8WKYYAN9E647MK9TB",
        "pcat_01KJ8PKDVEE8HTXZE24AQP18HB",
        "pcat_01KJ8PKDW02AYTTAXHH9ZW9AEK",
        "pcat_01KJ8PKDX7CTTRWFV0PWXEHXM9",
        "pcat_01KJ8PKDXTMMHKQZH5AMNN0HAZ",
        "pcat_01KJ8PKDYBF7VBS3QWS82EHAA0",
        "pcat_01KJ8PKDYXYBTRCFBWTBHG4X2P",
        "pcat_01KJ8PKE04YTC6CTPPWD4V7CC0",
        "pcat_01KJ8PKE0P7SJA4RE6P2ZGDJS5",
        "pcat_01KJ8PKE1A8HKD0KD1X93E2D2Q",
        "pcat_01KJ8PKE1WK0P5R8QZ9A0GPJ4H",
        "pcat_01KJ8PKE2GFYNJ8X08GYT4YB72",
        "pcat_01KJ8PKE4RSKFXVETYZ9ZQBA8X",
        "pcat_01KJ8PKE5AAZNY9DYKNR9PFY8Z",
        "pcat_01KJ8PKE5Z6M3SAAXNEMPC7QAY",
        "pcat_01KJ8PKE6JFP7VRGN5TXG41Q3D",
        "pcat_01KJ8PKE750FPSXTC40E6GEVVZ",
        "pcat_01KJ8PKE7SY3X2K56VR3QX0VXA",
        "pcat_01KJ8PKE9JNC8TQXGRMRQCJ72S",
        "pcat_01KJ8PKEA4WRS4SFY5WEE75F31"
      ]
    },
    {
      "id": "pcat_01KJ8PKDS1QJW9PN7PAZH0CXS1",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka-category-135",
      "children": [
        "pcat_01KJ8PKDSMK7WQH7HF7TCA2P1Z",
        "pcat_01KJ8PKDT8WKYYAN9E647MK9TB"
      ],
      "leafs": [
        "pcat_01KJ8PKDSMK7WQH7HF7TCA2P1Z",
        "pcat_01KJ8PKDT8WKYYAN9E647MK9TB"
      ]
    },
    {
      "id": "pcat_01KJ8PKDTVEDHMJYSF3GSY06SN",
      "name": "Mikiny",
      "handle": "mikiny-category-138",
      "children": [
        "pcat_01KJ8PKDVEE8HTXZE24AQP18HB",
        "pcat_01KJ8PKDW02AYTTAXHH9ZW9AEK"
      ],
      "leafs": [
        "pcat_01KJ8PKDVEE8HTXZE24AQP18HB",
        "pcat_01KJ8PKDW02AYTTAXHH9ZW9AEK"
      ]
    },
    {
      "id": "pcat_01KJ8PKDWNM93WYXH0W5MWSJ69",
      "name": "Bundy",
      "handle": "bundy-category-141",
      "children": [
        "pcat_01KJ8PKDX7CTTRWFV0PWXEHXM9",
        "pcat_01KJ8PKDXTMMHKQZH5AMNN0HAZ"
      ],
      "leafs": [
        "pcat_01KJ8PKDX7CTTRWFV0PWXEHXM9",
        "pcat_01KJ8PKDXTMMHKQZH5AMNN0HAZ"
      ]
    },
    {
      "id": "pcat_01KJ8PKDZG5PNPVF5SECPEA7NF",
      "name": "Kalhoty",
      "handle": "kalhoty-category-146",
      "children": [
        "pcat_01KJ8PKE04YTC6CTPPWD4V7CC0",
        "pcat_01KJ8PKE0P7SJA4RE6P2ZGDJS5"
      ],
      "leafs": [
        "pcat_01KJ8PKE04YTC6CTPPWD4V7CC0",
        "pcat_01KJ8PKE0P7SJA4RE6P2ZGDJS5"
      ]
    },
    {
      "id": "pcat_01KJ8PKE33CYQEQV5JBQ189HZR",
      "name": "Doplňky",
      "handle": "doplnky-category-152",
      "children": [
        "pcat_01KJ8PKE3Q21Y0VX42H84AJ2QG",
        "pcat_01KJ8PKE5AAZNY9DYKNR9PFY8Z",
        "pcat_01KJ8PKE5Z6M3SAAXNEMPC7QAY",
        "pcat_01KJ8PKE6JFP7VRGN5TXG41Q3D",
        "pcat_01KJ8PKE750FPSXTC40E6GEVVZ",
        "pcat_01KJ8PKE7SY3X2K56VR3QX0VXA",
        "pcat_01KJ8PKE9JNC8TQXGRMRQCJ72S",
        "pcat_01KJ8PKEA4WRS4SFY5WEE75F31"
      ],
      "leafs": [
        "pcat_01KJ8PKE4RSKFXVETYZ9ZQBA8X",
        "pcat_01KJ8PKE5AAZNY9DYKNR9PFY8Z",
        "pcat_01KJ8PKE5Z6M3SAAXNEMPC7QAY",
        "pcat_01KJ8PKE6JFP7VRGN5TXG41Q3D",
        "pcat_01KJ8PKE750FPSXTC40E6GEVVZ",
        "pcat_01KJ8PKE7SY3X2K56VR3QX0VXA",
        "pcat_01KJ8PKE9JNC8TQXGRMRQCJ72S",
        "pcat_01KJ8PKEA4WRS4SFY5WEE75F31"
      ]
    },
    {
      "id": "pcat_01KJ8PKE3Q21Y0VX42H84AJ2QG",
      "name": "Boty",
      "handle": "boty-category-153",
      "children": [
        "pcat_01KJ8PKE4RSKFXVETYZ9ZQBA8X"
      ],
      "leafs": [
        "pcat_01KJ8PKE4RSKFXVETYZ9ZQBA8X"
      ]
    },
    {
      "id": "pcat_01KJ8PKEBA9MWK89QVA8SY3X62",
      "name": "Oblečení",
      "handle": "obleceni-category-166",
      "children": [
        "pcat_01KJ8PKEDPACRC4KVVZMBK36YR",
        "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF",
        "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC",
        "pcat_01KJ8PKEM80WSC8TEMG37WGMQN",
        "pcat_01KJ8PKENZ76HRFF74CZMH2ZQR"
      ],
      "leafs": [
        "pcat_01KJ8PKEDPACRC4KVVZMBK36YR",
        "pcat_01KJ8PKEGN4BGAD2XNQ6R5YMTS",
        "pcat_01KJ8PKEH8NJY4EF960YDTSRMK",
        "pcat_01KJ8PKEJF85E0H2699F97QJSF",
        "pcat_01KJ8PKEK1XZE4JMCDPVRE0TE2",
        "pcat_01KJ8PKEM80WSC8TEMG37WGMQN",
        "pcat_01KJ8PKEQR622TN6S0F4AJRFGY"
      ]
    },
    {
      "id": "pcat_01KJ8PKEG3BFQN6SQXNV29NHMF",
      "name": "Kraťasy",
      "handle": "kratasy-category-174",
      "children": [
        "pcat_01KJ8PKEGN4BGAD2XNQ6R5YMTS",
        "pcat_01KJ8PKEH8NJY4EF960YDTSRMK"
      ],
      "leafs": [
        "pcat_01KJ8PKEGN4BGAD2XNQ6R5YMTS",
        "pcat_01KJ8PKEH8NJY4EF960YDTSRMK"
      ]
    },
    {
      "id": "pcat_01KJ8PKEHW15Z2EJC6EP1GK5VC",
      "name": "Rukavice",
      "handle": "rukavice-category-177",
      "children": [
        "pcat_01KJ8PKEJF85E0H2699F97QJSF",
        "pcat_01KJ8PKEK1XZE4JMCDPVRE0TE2"
      ],
      "leafs": [
        "pcat_01KJ8PKEJF85E0H2699F97QJSF",
        "pcat_01KJ8PKEK1XZE4JMCDPVRE0TE2"
      ]
    },
    {
      "id": "pcat_01KJ8PKENZ76HRFF74CZMH2ZQR",
      "name": "Doplňky",
      "handle": "doplnky-category-184",
      "children": [
        "pcat_01KJ8PKEQR622TN6S0F4AJRFGY"
      ],
      "leafs": [
        "pcat_01KJ8PKEQR622TN6S0F4AJRFGY"
      ]
    },
    {
      "id": "pcat_01KJ8PKFKG35HZ6KD9MHXBFAAD",
      "name": "Snowboarding",
      "handle": "snowboarding-category-234",
      "children": [
        "pcat_01KJ8PKFQ5H7RWNYFMZ5JX5ZZQ",
        "pcat_01KJ8PKFQSZWVQPAGQKZW3ZEG7",
        "pcat_01KJ8PKFRBV6F8SXQ2GWA5F2H0",
        "pcat_01KJ8PKFRX7W1T0V6747MEPJ1M"
      ],
      "leafs": [
        "pcat_01KJ8PKFQ5H7RWNYFMZ5JX5ZZQ",
        "pcat_01KJ8PKFQSZWVQPAGQKZW3ZEG7",
        "pcat_01KJ8PKFRBV6F8SXQ2GWA5F2H0",
        "pcat_01KJ8PKFRX7W1T0V6747MEPJ1M"
      ]
    },
    {
      "id": "pcat_01KJ8PKFYEP3054YN2N31H1FS6",
      "name": "Oblečení",
      "handle": "obleceni-category-252",
      "children": [
        "pcat_01KJ8PKFZ0SV466C80AFMRDATX",
        "pcat_01KJ8PKFZJKENVZY7TDYGNEFDS",
        "pcat_01KJ8PKG05YY9B27TVAQ0REDR1",
        "pcat_01KJ8PKG0RX28P2Y3N8JMFNHNB"
      ],
      "leafs": [
        "pcat_01KJ8PKFZ0SV466C80AFMRDATX",
        "pcat_01KJ8PKFZJKENVZY7TDYGNEFDS",
        "pcat_01KJ8PKG05YY9B27TVAQ0REDR1",
        "pcat_01KJ8PKG0RX28P2Y3N8JMFNHNB"
      ]
    },
    {
      "id": "pcat_01KJ8PKG1Z91DC7Z9PAWKPAN1S",
      "name": "Doplňky",
      "handle": "doplnky-category-258",
      "children": [
        "pcat_01KJ8PKG4WM2WFJ69M1Q48232H",
        "pcat_01KJ8PKG5GVKN7BY46PXPAM9RQ"
      ],
      "leafs": [
        "pcat_01KJ8PKG4WM2WFJ69M1Q48232H",
        "pcat_01KJ8PKG5GVKN7BY46PXPAM9RQ"
      ]
    },
    {
      "id": "pcat_01KJ8PKG6PNQ4H22F0E2WBAM16",
      "name": "Oblečení",
      "handle": "obleceni-category-266",
      "children": [
        "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC",
        "pcat_01KJ8PKG94N4CVM36AGYYQ58MS",
        "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R",
        "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF",
        "pcat_01KJ8PKGE4DN810TW15BFM636Q",
        "pcat_01KJ8PKGEQGWTBJ0JD0J1GC1PB",
        "pcat_01KJ8PKGFSE322B5RQWA4VM2A3"
      ],
      "leafs": [
        "pcat_01KJ8PKG7W9GNZGTH519V2XBPD",
        "pcat_01KJ8PKG8GFS2ZP46MAC43YT2Y",
        "pcat_01KJ8PKGA862SWXQ8ZEB95TPBQ",
        "pcat_01KJ8PKGBACMHZ81KDHZP49B5H",
        "pcat_01KJ8PKGBXH1Q6QF0NH617TNF6",
        "pcat_01KJ8PKGD13CP39WJJX3H2X3KS",
        "pcat_01KJ8PKGDJPHS3TZMYXQZY82T9",
        "pcat_01KJ8PKGE4DN810TW15BFM636Q",
        "pcat_01KJ8PKGEQGWTBJ0JD0J1GC1PB",
        "pcat_01KJ8PKGGHSEVR2Q7HNSRM3A1S",
        "pcat_01KJ8PKGH3RS1WN6V7APCDK4ZB",
        "pcat_01KJ8PKGHSJQZ2VD48WBXQRCGK",
        "pcat_01KJ8PKGJCHAQ44ZGKC34H2RDJ",
        "pcat_01KJ8PKGKHHE9RN9KZWN2T4CPV"
      ]
    },
    {
      "id": "pcat_01KJ8PKG792ZW2J1K1A6YA8RCC",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka-category-267",
      "children": [
        "pcat_01KJ8PKG7W9GNZGTH519V2XBPD",
        "pcat_01KJ8PKG8GFS2ZP46MAC43YT2Y"
      ],
      "leafs": [
        "pcat_01KJ8PKG7W9GNZGTH519V2XBPD",
        "pcat_01KJ8PKG8GFS2ZP46MAC43YT2Y"
      ]
    },
    {
      "id": "pcat_01KJ8PKG94N4CVM36AGYYQ58MS",
      "name": "Mikiny",
      "handle": "mikiny-category-270",
      "children": [
        "pcat_01KJ8PKGA862SWXQ8ZEB95TPBQ"
      ],
      "leafs": [
        "pcat_01KJ8PKGA862SWXQ8ZEB95TPBQ"
      ]
    },
    {
      "id": "pcat_01KJ8PKGARB1NBSCR2ERFA6Q1R",
      "name": "Bundy",
      "handle": "bundy-category-273",
      "children": [
        "pcat_01KJ8PKGBACMHZ81KDHZP49B5H",
        "pcat_01KJ8PKGBXH1Q6QF0NH617TNF6"
      ],
      "leafs": [
        "pcat_01KJ8PKGBACMHZ81KDHZP49B5H",
        "pcat_01KJ8PKGBXH1Q6QF0NH617TNF6"
      ]
    },
    {
      "id": "pcat_01KJ8PKGCEWX7QMFJ3T5GE79AF",
      "name": "Kalhoty",
      "handle": "kalhoty-category-276",
      "children": [
        "pcat_01KJ8PKGD13CP39WJJX3H2X3KS",
        "pcat_01KJ8PKGDJPHS3TZMYXQZY82T9"
      ],
      "leafs": [
        "pcat_01KJ8PKGD13CP39WJJX3H2X3KS",
        "pcat_01KJ8PKGDJPHS3TZMYXQZY82T9"
      ]
    },
    {
      "id": "pcat_01KJ8PKGFSE322B5RQWA4VM2A3",
      "name": "Doplňky",
      "handle": "doplnky-category-281",
      "children": [
        "pcat_01KJ8PKGGHSEVR2Q7HNSRM3A1S",
        "pcat_01KJ8PKGH3RS1WN6V7APCDK4ZB",
        "pcat_01KJ8PKGHSJQZ2VD48WBXQRCGK",
        "pcat_01KJ8PKGJCHAQ44ZGKC34H2RDJ",
        "pcat_01KJ8PKGKHHE9RN9KZWN2T4CPV"
      ],
      "leafs": [
        "pcat_01KJ8PKGGHSEVR2Q7HNSRM3A1S",
        "pcat_01KJ8PKGH3RS1WN6V7APCDK4ZB",
        "pcat_01KJ8PKGHSJQZ2VD48WBXQRCGK",
        "pcat_01KJ8PKGJCHAQ44ZGKC34H2RDJ",
        "pcat_01KJ8PKGKHHE9RN9KZWN2T4CPV"
      ]
    },
    {
      "id": "pcat_01KJ8PKH95DS3VYST2SEBQRQB4",
      "name": "Snowboarding",
      "handle": "snowboarding-category-324",
      "children": [
        "pcat_01KJ8PKHCP48HR09RTZ666F0V2",
        "pcat_01KJ8PKHDD1MVBVHQYPNEXRRNG",
        "pcat_01KJ8PKHE02GQBSXMWMJK708W9",
        "pcat_01KJ8PKHEMW74614FCQBC87ND0"
      ],
      "leafs": [
        "pcat_01KJ8PKHCP48HR09RTZ666F0V2",
        "pcat_01KJ8PKHDD1MVBVHQYPNEXRRNG",
        "pcat_01KJ8PKHE02GQBSXMWMJK708W9",
        "pcat_01KJ8PKHEMW74614FCQBC87ND0"
      ]
    },
    {
      "id": "pcat_01KJ8PKHH1NW9B33VCTG13FHX1",
      "name": "Oblečení",
      "handle": "obleceni-category-337",
      "children": [
        "pcat_01KJ8PKHHPW3FDJP0BABT512ZR",
        "pcat_01KJ8PKHJ78Y321ARYY6EMJKF2",
        "pcat_01KJ8PKHJVW0D8DSK4BTPZF4FB",
        "pcat_01KJ8PKHKGJ79BMBMR3Q47AAXD"
      ],
      "leafs": [
        "pcat_01KJ8PKHHPW3FDJP0BABT512ZR",
        "pcat_01KJ8PKHJ78Y321ARYY6EMJKF2",
        "pcat_01KJ8PKHJVW0D8DSK4BTPZF4FB",
        "pcat_01KJ8PKHKGJ79BMBMR3Q47AAXD"
      ]
    },
    {
      "id": "pcat_01KJ8PKHQB2B245D110Q7K7NSS",
      "name": "Oblečení",
      "handle": "obleceni-category-347",
      "children": [
        "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS",
        "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP",
        "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV",
        "pcat_01KJ8PKHXPNMHEXJQ67J66X6RV",
        "pcat_01KJ8PKHYF5Q2A0FHZ8CRSBVVB",
        "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53",
        "pcat_01KJ8PKJ0VQTC9NZ7NDA67EGMV",
        "pcat_01KJ8PKJ1C6KY3GCWE83M7TSSZ",
        "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
        "pcat_01KJ8PKJ9RXMV1D6BR1TQFZ4HP"
      ],
      "leafs": [
        "pcat_01KJ8PKHRJYETYMS5BZ64WA2J9",
        "pcat_01KJ8PKHS5AXX226EDC4NQ9PRR",
        "pcat_01KJ8PKHTESRFQACFAASYQ4S7V",
        "pcat_01KJ8PKHV1J6P2ZW8D851DCR2F",
        "pcat_01KJ8PKHW9GM84V9EV1DCEJJNQ",
        "pcat_01KJ8PKHX3C06P46Q96Q0M8V2T",
        "pcat_01KJ8PKHXPNMHEXJQ67J66X6RV",
        "pcat_01KJ8PKHYF5Q2A0FHZ8CRSBVVB",
        "pcat_01KJ8PKHZNFQ4QJ0K1FM2NF3V2",
        "pcat_01KJ8PKJ09JNYFDMFYZV5TE74B",
        "pcat_01KJ8PKJ0VQTC9NZ7NDA67EGMV",
        "pcat_01KJ8PKJ1C6KY3GCWE83M7TSSZ",
        "pcat_01KJ8PKJ38TPV1S2YCHB1VKJC9",
        "pcat_01KJ8PKJ3TAS6DQX44XBHSCW3D",
        "pcat_01KJ8PKJ4CHHBV92JWAWJ2HETC",
        "pcat_01KJ8PKJ51S295GB4HXMHF9H4A",
        "pcat_01KJ8PKJ5N1HPW788N46X2B0V2",
        "pcat_01KJ8PKJ68NYGXN86WGKTBR1PQ",
        "pcat_01KJ8PKJ6SMMSJC6JCBN0KYN1Y",
        "pcat_01KJ8PKJ7CEYWGM0MWGBSGZQP3",
        "pcat_01KJ8PKJ7ZBAEGN539400PHX27",
        "pcat_01KJ8PKJ8J6DQKVJKGN8VF5EP6",
        "pcat_01KJ8PKJ95C4T5FMQS8YZ3FNED",
        "pcat_01KJ8PKJ9RXMV1D6BR1TQFZ4HP"
      ]
    },
    {
      "id": "pcat_01KJ8PKHQZCCXXGKEATA2EZCAS",
      "name": "Trika a tílka",
      "handle": "trika-a-tilka-category-348",
      "children": [
        "pcat_01KJ8PKHRJYETYMS5BZ64WA2J9",
        "pcat_01KJ8PKHS5AXX226EDC4NQ9PRR"
      ],
      "leafs": [
        "pcat_01KJ8PKHRJYETYMS5BZ64WA2J9",
        "pcat_01KJ8PKHS5AXX226EDC4NQ9PRR"
      ]
    },
    {
      "id": "pcat_01KJ8PKHSTGZM1MQXXE3XXBTHP",
      "name": "Mikiny",
      "handle": "mikiny-category-351",
      "children": [
        "pcat_01KJ8PKHTESRFQACFAASYQ4S7V",
        "pcat_01KJ8PKHV1J6P2ZW8D851DCR2F"
      ],
      "leafs": [
        "pcat_01KJ8PKHTESRFQACFAASYQ4S7V",
        "pcat_01KJ8PKHV1J6P2ZW8D851DCR2F"
      ]
    },
    {
      "id": "pcat_01KJ8PKHVNHV5Y40852ZP4TPVV",
      "name": "Bundy",
      "handle": "bundy-category-354",
      "children": [
        "pcat_01KJ8PKHW9GM84V9EV1DCEJJNQ",
        "pcat_01KJ8PKHX3C06P46Q96Q0M8V2T"
      ],
      "leafs": [
        "pcat_01KJ8PKHW9GM84V9EV1DCEJJNQ",
        "pcat_01KJ8PKHX3C06P46Q96Q0M8V2T"
      ]
    },
    {
      "id": "pcat_01KJ8PKHZ1TBRMW9RZGHDQ0K53",
      "name": "Kalhoty",
      "handle": "kalhoty-category-359",
      "children": [
        "pcat_01KJ8PKHZNFQ4QJ0K1FM2NF3V2",
        "pcat_01KJ8PKJ09JNYFDMFYZV5TE74B"
      ],
      "leafs": [
        "pcat_01KJ8PKHZNFQ4QJ0K1FM2NF3V2",
        "pcat_01KJ8PKJ09JNYFDMFYZV5TE74B"
      ]
    },
    {
      "id": "pcat_01KJ8PKJ1ZSG3ZJHTTS6Q3QTCT",
      "name": "Doplňky",
      "handle": "doplnky-category-364",
      "children": [
        "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR",
        "pcat_01KJ8PKJ4CHHBV92JWAWJ2HETC",
        "pcat_01KJ8PKJ51S295GB4HXMHF9H4A",
        "pcat_01KJ8PKJ5N1HPW788N46X2B0V2",
        "pcat_01KJ8PKJ68NYGXN86WGKTBR1PQ",
        "pcat_01KJ8PKJ6SMMSJC6JCBN0KYN1Y",
        "pcat_01KJ8PKJ7CEYWGM0MWGBSGZQP3",
        "pcat_01KJ8PKJ7ZBAEGN539400PHX27",
        "pcat_01KJ8PKJ8J6DQKVJKGN8VF5EP6",
        "pcat_01KJ8PKJ95C4T5FMQS8YZ3FNED"
      ],
      "leafs": [
        "pcat_01KJ8PKJ38TPV1S2YCHB1VKJC9",
        "pcat_01KJ8PKJ3TAS6DQX44XBHSCW3D",
        "pcat_01KJ8PKJ4CHHBV92JWAWJ2HETC",
        "pcat_01KJ8PKJ51S295GB4HXMHF9H4A",
        "pcat_01KJ8PKJ5N1HPW788N46X2B0V2",
        "pcat_01KJ8PKJ68NYGXN86WGKTBR1PQ",
        "pcat_01KJ8PKJ6SMMSJC6JCBN0KYN1Y",
        "pcat_01KJ8PKJ7CEYWGM0MWGBSGZQP3",
        "pcat_01KJ8PKJ7ZBAEGN539400PHX27",
        "pcat_01KJ8PKJ8J6DQKVJKGN8VF5EP6",
        "pcat_01KJ8PKJ95C4T5FMQS8YZ3FNED"
      ]
    },
    {
      "id": "pcat_01KJ8PKJ2K9JW138SXBYCWGTWR",
      "name": "Boty",
      "handle": "boty-category-365",
      "children": [
        "pcat_01KJ8PKJ38TPV1S2YCHB1VKJC9",
        "pcat_01KJ8PKJ3TAS6DQX44XBHSCW3D"
      ],
      "leafs": [
        "pcat_01KJ8PKJ38TPV1S2YCHB1VKJC9",
        "pcat_01KJ8PKJ3TAS6DQX44XBHSCW3D"
      ]
    },
    {
      "id": "pcat_01KJ8PKJAXA9SC28N04Y5F1655",
      "name": "Oblečení",
      "handle": "obleceni-category-379",
      "children": [
        "pcat_01KJ8PKJD5YCBMXQ19HC5D3H4Z",
        "pcat_01KJ8PKJDR9GD9YZYA8873JSZP",
        "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3",
        "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME",
        "pcat_01KJ8PKJKV5F90D18BN594S9X7",
        "pcat_01KJ8PKJNHWTNE9QGMEXB8HR4V"
      ],
      "leafs": [
        "pcat_01KJ8PKJD5YCBMXQ19HC5D3H4Z",
        "pcat_01KJ8PKJE9N6789BMXX845JAQW",
        "pcat_01KJ8PKJG5NQMBAK24CYDAT9NZ",
        "pcat_01KJ8PKJGQDDNVQVH92VNY8PB2",
        "pcat_01KJ8PKJJ0RQGDCSB7DJ24G1WA",
        "pcat_01KJ8PKJJQHWXQQ7QZ7S2165DE",
        "pcat_01KJ8PKJKV5F90D18BN594S9X7",
        "pcat_01KJ8PKJQH8013X22SDFEGVDX7"
      ]
    },
    {
      "id": "pcat_01KJ8PKJDR9GD9YZYA8873JSZP",
      "name": "Kalhoty",
      "handle": "kalhoty-category-384",
      "children": [
        "pcat_01KJ8PKJE9N6789BMXX845JAQW"
      ],
      "leafs": [
        "pcat_01KJ8PKJE9N6789BMXX845JAQW"
      ]
    },
    {
      "id": "pcat_01KJ8PKJFKNTMQ56AV8V4NW7W3",
      "name": "Kraťasy",
      "handle": "kratasy-category-387",
      "children": [
        "pcat_01KJ8PKJG5NQMBAK24CYDAT9NZ",
        "pcat_01KJ8PKJGQDDNVQVH92VNY8PB2"
      ],
      "leafs": [
        "pcat_01KJ8PKJG5NQMBAK24CYDAT9NZ",
        "pcat_01KJ8PKJGQDDNVQVH92VNY8PB2"
      ]
    },
    {
      "id": "pcat_01KJ8PKJHBX9ZX384XRNNCH8ME",
      "name": "Rukavice",
      "handle": "rukavice-category-390",
      "children": [
        "pcat_01KJ8PKJJ0RQGDCSB7DJ24G1WA",
        "pcat_01KJ8PKJJQHWXQQ7QZ7S2165DE"
      ],
      "leafs": [
        "pcat_01KJ8PKJJ0RQGDCSB7DJ24G1WA",
        "pcat_01KJ8PKJJQHWXQQ7QZ7S2165DE"
      ]
    },
    {
      "id": "pcat_01KJ8PKJNHWTNE9QGMEXB8HR4V",
      "name": "Doplňky",
      "handle": "doplnky-category-397",
      "children": [
        "pcat_01KJ8PKJQH8013X22SDFEGVDX7"
      ],
      "leafs": [
        "pcat_01KJ8PKJQH8013X22SDFEGVDX7"
      ]
    },
    {
      "id": "pcat_01KJ8PKTS4FNXT19VJDAPV0JVZ",
      "name": "Doplňky",
      "handle": "doplnky-komponenty",
      "children": [
        "pcat_01KJ8PKV221MC1Y78GWBXE0KKK"
      ],
      "leafs": [
        "pcat_01KJ8PKV221MC1Y78GWBXE0KKK"
      ]
    },
    {
      "id": "pcat_01KJ8PKKJ51ND9ETH4HVYVA48K",
      "name": "Doplňky",
      "handle": "doplnky-category-444",
      "children": [
        "pcat_01KJ8PKKK9HE68GJ665VWWC19Q"
      ],
      "leafs": [
        "pcat_01KJ8PKKK9HE68GJ665VWWC19Q"
      ]
    },
    {
      "id": "pcat_01KJ8PKKN362Z5MXMWDCFGXK9E",
      "name": "Snowboarding",
      "handle": "snowboarding-category-449",
      "children": [
        "pcat_01KJ8PKKRM26M39A3RNRA3BVGM",
        "pcat_01KJ8PKKS6Y9PK6RP5N31SFT2V",
        "pcat_01KJ8PKKSR5XFKZ3TAFE8HNQHQ",
        "pcat_01KJ8PKKTC44XRRAKGXB9RTHVY",
        "pcat_01KJ8PKRYHFA0NWW62Y7PH814X"
      ],
      "leafs": [
        "pcat_01KJ8PKKRM26M39A3RNRA3BVGM",
        "pcat_01KJ8PKKS6Y9PK6RP5N31SFT2V",
        "pcat_01KJ8PKKSR5XFKZ3TAFE8HNQHQ",
        "pcat_01KJ8PKKTC44XRRAKGXB9RTHVY",
        "pcat_01KJ8PKRYHFA0NWW62Y7PH814X"
      ]
    },
    {
      "id": "pcat_01KJ8PKKZQFJ1BFG005CGDWSGA",
      "name": "Oblečení",
      "handle": "obleceni-category-467",
      "children": [
        "pcat_01KJ8PKM0A17E98H5KHNZPEJ9P",
        "pcat_01KJ8PKM10ZEHAXH5Y3RYX5VV1",
        "pcat_01KJ8PKM1JY2HW23ENTA4XJ516",
        "pcat_01KJ8PKM258QYJN6X0BDY6RFVN"
      ],
      "leafs": [
        "pcat_01KJ8PKM0A17E98H5KHNZPEJ9P",
        "pcat_01KJ8PKM10ZEHAXH5Y3RYX5VV1",
        "pcat_01KJ8PKM1JY2HW23ENTA4XJ516",
        "pcat_01KJ8PKM258QYJN6X0BDY6RFVN"
      ]
    },
    {
      "id": "pcat_01KJ8PKM3GHWY8YQSEM3A002VM",
      "name": "Doplňky",
      "handle": "doplnky-category-473",
      "children": [
        "pcat_01KJ8PKM6G2334KB5B65V2A9F3",
        "pcat_01KJ8PKM71XV3KJ0E9PQFCDE2Z"
      ],
      "leafs": [
        "pcat_01KJ8PKM6G2334KB5B65V2A9F3",
        "pcat_01KJ8PKM71XV3KJ0E9PQFCDE2Z"
      ]
    }
  ],
  "generatedAt": "2026-02-24T21:49:56.875Z",
  "filteringStats": {
    "totalCategoriesBeforeFiltering": 580,
    "totalCategoriesAfterFiltering": 212,
    "categoriesWithDirectProducts": 213,
    "filteredOutCount": 368
  }
}

// Export only the data that is actually used in the app
export const { allCategories, categoryTree, rootCategories, categoryMap, leafCategories } = data
