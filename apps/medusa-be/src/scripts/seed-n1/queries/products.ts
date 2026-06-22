import type { SQL } from "drizzle-orm"
import { sql } from "drizzle-orm"

/** Product result from complex database query with JSON fields */
export type ProductRaw = {
  title: string
  handle: string
  description?: string
  thumbnail?: string
  images: string
  variants: string
  options: string
  categories: string
  brand: string
}

/** SQL query to fetch products from legacy database */
export const productsSql: SQL<ProductRaw> = sql`
  WITH RECURSIVE cte_products_base AS (
    SELECT
      p.*,
      ROW_NUMBER() OVER (PARTITION BY IF(p.EAN = '', p.id, p.EAN) ORDER BY p.id) AS ean_duplicate_number
    FROM product p
    LEFT JOIN category_product cp ON cp.id_product = p.id
    WHERE p.deleted = 0
      AND cp.id_category IN (SELECT cac.category_id FROM cte_allowed_categories cac)
  ),
  cte_products_baseline AS (
    SELECT p.*
    FROM cte_products_base p
    WHERE p.ean_duplicate_number = 1
  ),
  cte_products AS (
    SELECT p.*
    FROM cte_products_baseline p
    JOIN product_lang pl
      ON pl.id_product = p.id
      AND pl.id_lang = (SELECT id FROM lang WHERE abbreviation = 'cz' LIMIT 1)
      AND TRIM(pl.rewrite_title) <> ''
    WHERE p.base_product = 1
      AND p.deleted = 0
      AND p.id_product_group IS NOT NULL
      AND p.id_product_group NOT IN (
        SELECT id_product_group
        FROM product
        WHERE id_product_group IN (
          SELECT id_product_group
          FROM product
          WHERE base_product = 1
            AND deleted = 0
            AND id_product_group IS NOT NULL
          GROUP BY id_product_group
          HAVING COUNT(*) > 1
        )
        AND deleted = 0
      )
      AND TRIM(pl.title) <> ''
  ),
  cte_product_with_variant_nums AS (
    SELECT
      p.*,
      ROW_NUMBER() OVER (PARTITION BY p.id_product_group, p.variant_name ORDER BY p.id) AS variant_num
    FROM product p
    WHERE p.deleted = 0
      AND id_product_group IS NOT NULL
  ),
  cte_product_with_unique_variant_name AS (
    SELECT
      *,
      CONCAT(TRIM(variant_name), IF(variant_num = 1, '', CONCAT('_', variant_num))) AS variant_name_unique
    FROM cte_product_with_variant_nums
    WHERE base_product = 0
      AND variant_name IS NOT NULL
      AND TRIM(variant_name) <> ''
  ),
  cte_variant_option_agg AS (
    SELECT
      id_product_group,
      JSON_ARRAYAGG(DISTINCT variant_name_unique) AS option_values
    FROM cte_product_with_unique_variant_name
    GROUP BY id_product_group
  ),
  cte_category_product AS (
    SELECT p.id, cl.rewrite_title
    FROM product p
    JOIN category_product cp ON p.id = cp.id_product
    JOIN category_lang cl ON cl.id_category = cp.id_category
      AND cl.id_lang IN (SELECT id FROM lang WHERE abbreviation = 'cz')
  ),
  cte_category_product_unique AS (
    SELECT
      vc.id,
      JSON_ARRAYAGG(JSON_OBJECT('handle', vc.rewrite_title)) AS categories
    FROM cte_category_product AS vc
    GROUP BY vc.id
  ),
  cte_product_attributes_base AS (
    SELECT
      p.id,
      pl.rewrite_title AS handle,
      ppl.title AS attribute,
      ppvl.title AS value
    FROM cte_products p
    JOIN product_lang pl ON p.id = pl.id_product
      AND pl.id_lang IN (SELECT id FROM lang WHERE abbreviation = 'cz')
    LEFT JOIN product_product_parameter ppp ON ppp.id_product = p.id
    LEFT JOIN product_parameter_lang ppl ON ppl.id_product_parameter = ppp.id_product_parameter
      AND ppl.id_lang IN (SELECT id FROM lang WHERE abbreviation = 'cz')
    LEFT JOIN product_parameter_value ppv ON ppv.id = ppp.id_product_parameter_value
    LEFT JOIN product_parameter_value_lang ppvl ON ppvl.id_product_parameter_value = ppv.id
      AND ppvl.id_lang IN (SELECT id FROM lang WHERE abbreviation = 'cz')
    WHERE pl.rewrite_title NOT LIKE ''
  ),
  cte_product_material AS (
    SELECT *
    FROM cte_product_attributes_base cpa
    WHERE attribute = 'Materiál'
  ),
  cte_product_attributes AS (
    SELECT
      cpab.id,
      JSON_ARRAYAGG(JSON_OBJECT('name', cpab.attribute, 'value', cpab.value)) AS attributes
    FROM cte_product_attributes_base AS cpab
    WHERE cpab.attribute NOT IN ('Materiál')
    GROUP BY id
  ),
  cte_product_brand AS (
    SELECT
      p.id AS productId,
      pr.title,
      JSON_OBJECT(
        'title', pr.title,
        'attributes', JSON_ARRAY(
          JSON_OBJECT('name', 'sizing_info', 'value', pl.sizing_info)
        )
      ) AS brand
    FROM cte_products p
    JOIN brand pr ON p.id_brand = pr.id
    JOIN brand_lang pl ON pl.id_brand = pr.id
      AND pl.id_lang IN (SELECT id FROM lang WHERE abbreviation = 'cz')
  ),
  cte_product_prices AS (
    SELECT
      p.id AS productId,
      price.value AS value,
      COALESCE(price.nodiscount_value, price.value) AS nodiscount_value,
      price.value AS normal_value,
      vat.rate AS vat_rate,
      price_type.id AS id_price_type,
      price_type.id_primary_price,
      price_type.discount_type,
      price_type.system,
      price_type.default_discount,
      price.valid_from_quantity,
      LOWER(c.code) AS currency_code,
      price_type_lang.title AS price_type_title
    FROM price_type
    LEFT JOIN price ON price.id_price_type = price_type.id
      AND price.id_domain = (SELECT id FROM domain WHERE id = 1)
      AND price.id_currency IN (SELECT id FROM currency WHERE code IN ('czk', 'eur'))
    LEFT JOIN currency c ON c.id = price.id_currency
    LEFT JOIN product p ON p.id = price.id_product
    LEFT JOIN vat ON price.id_vat = vat.id
    LEFT JOIN price_type_lang ON price_type.id = price_type_lang.id_price_type
      AND price_type_lang.id_lang IN (SELECT id FROM lang WHERE abbreviation = 'cz')
    WHERE price_type_lang.title = 'MOC'
      AND p.deleted = 0
    ORDER BY valid_from_quantity DESC, vat.rate DESC, price.value ASC
  ),
  cte_product_prices_agg AS (
    SELECT
      cpp.productId,
      JSON_ARRAYAGG(JSON_OBJECT('currency_code', cpp.currency_code, 'amount', cpp.value)) AS prices
    FROM cte_product_prices cpp
    GROUP BY cpp.productId
  ),
  cte_product_stores AS (
    SELECT
      psq.id_product AS productId,
      SUM(psq.quantity) AS quantity,
      SUM(psq.supplier_quantity) AS supplier_quantity
    FROM product_store_quantity psq
    JOIN product pwvn ON pwvn.id = psq.id_product
    WHERE pwvn.deleted = 0
    GROUP BY psq.id_product
  ),
  cte_product_images AS (
    SELECT
      p.id_product_group,
      ROW_NUMBER() OVER (PARTITION BY i.id_product) AS image_num,
      i.*
    FROM image i
    JOIN product p ON p.id = i.id_product
    WHERE p.deleted = 0
  ),
  cte_product_images_unique AS (
    SELECT DISTINCT
      i.id_product,
      JSON_ARRAYAGG(JSON_OBJECT('url', CONCAT('https://pub-adde8a563e2c43f7b6bc296d81c86358.r2.dev/1024_1024/', i.url))) AS images
    FROM cte_product_images i
    GROUP BY i.id_product
  ),
  cte_product_images_grouped AS (
    SELECT
      cpi.id_product_group,
      JSON_ARRAYAGG(JSON_OBJECT('url', CONCAT('https://pub-adde8a563e2c43f7b6bc296d81c86358.r2.dev/1024_1024/', cpi.url))) AS images
    FROM (SELECT DISTINCT cpi.id_product_group, cpi.url FROM cte_product_images cpi) cpi
    GROUP BY cpi.id_product_group
  ),
  cte_variants AS (
    SELECT
      bp.id,
      JSON_OBJECT(
        'title', COALESCE(TRIM(v.variant_name_unique), pl.title),
        'sku', COALESCE(v_pl.rewrite_title, CONCAT(pl.rewrite_title, IF(v.id IS NULL, '', v.id))),
        'material', COALESCE(cpmv.value, cpmbp.value),
        'options', JSON_OBJECT('Variant', TRIM(v.variant_name_unique)),
        'prices', COALESCE(cpp.prices, cpbp.prices),
        'images', COALESCE(cbppiv.images, cbppivbp.images),
        'thumbnail', CONCAT('https://pub-adde8a563e2c43f7b6bc296d81c86358.r2.dev/1024_1024/', COALESCE(cbppivt.url, cbppivtbp.url)),
        'metadata', JSON_OBJECT(
          'attributes', COALESCE(cpav.attributes, cpabp.attributes),
          'user_code', COALESCE(v.user_code, bp.user_code)
        ),
        'quantities', JSON_OBJECT(
          'quantity', TRIM(COALESCE(vcps.quantity, bpcps.quantity)),
          'supplier_quantity', TRIM(COALESCE(vcps.supplier_quantity, bpcps.supplier_quantity))
        )
      ) AS variants
    FROM cte_products bp
    LEFT JOIN cte_product_with_unique_variant_name v
      ON v.id_product_group = bp.id_product_group
      AND v.base_product = 0
      AND v.deleted = 0
    LEFT JOIN cte_product_attributes cpav ON v.id = cpav.id
    LEFT JOIN cte_product_attributes cpabp ON bp.id = cpabp.id
    LEFT JOIN cte_product_material cpmv ON v.id = cpmv.id
    LEFT JOIN cte_product_material cpmbp ON bp.id = cpmbp.id
    LEFT JOIN cte_product_stores vcps ON vcps.productId = v.id
    LEFT JOIN cte_product_stores bpcps ON bpcps.productId = bp.id
    JOIN product_lang pl
      ON pl.id_product = bp.id
      AND pl.id_lang = (SELECT id FROM lang WHERE abbreviation = 'cz' LIMIT 1)
      AND TRIM(pl.rewrite_title) <> ''
    LEFT JOIN product_lang v_pl
      ON v_pl.id_product = v.id
      AND v_pl.id_lang = pl.id_lang
      AND TRIM(v_pl.rewrite_title) <> ''
    LEFT JOIN cte_product_prices_agg cpbp ON cpbp.productId = bp.id
    LEFT JOIN cte_product_prices_agg cpp ON cpp.productId = v.id
    LEFT JOIN cte_product_images_unique cbppiv ON cbppiv.id_product = v.id
    LEFT JOIN cte_product_images cbppivt ON cbppivt.id_product = v.id AND cbppivt.image_num = 1
    LEFT JOIN cte_product_images_unique cbppivbp ON cbppivbp.id_product = bp.id
    LEFT JOIN cte_product_images cbppivtbp ON cbppivtbp.id_product = bp.id AND cbppivtbp.image_num = 1
    GROUP BY bp.id, pl.title, pl.rewrite_title, pl.description, COALESCE(v_pl.rewrite_title, CONCAT(pl.rewrite_title, v.id))
  ),
  cte_variants_grouped AS (
    SELECT
      cv.id,
      JSON_ARRAYAGG(cv.variants) AS variants
    FROM cte_variants cv
    GROUP BY cv.id
  ),
  cte_category_path AS (
    SELECT
      id AS category_id,
      id_parent,
      id AS current_id,
      0 AS depth
    FROM category

    UNION ALL

    SELECT
      cp.category_id,
      c.id_parent,
      c.id AS current_id,
      cp.depth + 1
    FROM cte_category_path cp
    JOIN category c ON cp.id_parent = c.id
  ),
  cte_category_base AS (
    SELECT
      c.category_id,
      c.depth,
      c.current_id AS root_id,
      clRoot.title AS root_title,
      cl.title AS title
    FROM cte_category_path c
    LEFT JOIN category_lang clRoot ON clRoot.id_category = c.current_id
      AND clRoot.id_lang IN (SELECT id FROM lang WHERE abbreviation = 'cz')
    LEFT JOIN category_lang cl ON cl.id_category = c.category_id
      AND cl.id_lang IN (SELECT id FROM lang WHERE abbreviation = 'cz')
    WHERE id_parent IS NULL
  ),
  cte_category_whitelist AS (
    SELECT *
    FROM cte_category_base
    WHERE title LIKE 'Oblečení'
      AND root_title IN ('Oblečení', 'Dětské', 'Dámské', 'Pánské')
  ),
  cte_allowed_categories AS (
    SELECT *
    FROM cte_category_base
    WHERE root_id IN (SELECT category_id FROM cte_category_whitelist)
  ),
  cte_result AS (
    SELECT
      bp.id AS productId,
      bp.id_product_group,
      pl.title,
      pl.rewrite_title AS handle,
      pl.description,
      CONCAT('https://pub-adde8a563e2c43f7b6bc296d81c86358.r2.dev/1024_1024/', cbppi.url) AS thumbnail,
      cpig.images AS images,
      cv.variants,
      JSON_ARRAY(JSON_OBJECT('title', 'Variant', 'option_values', voa.option_values)) AS options,
      vc.categories,
      cppr.brand
    FROM cte_products bp
    JOIN product_lang pl
      ON pl.id_product = bp.id
      AND pl.id_lang = (SELECT id FROM lang WHERE abbreviation = 'cz' LIMIT 1)
      AND TRIM(pl.rewrite_title) <> ''
    LEFT JOIN cte_product_with_unique_variant_name v
      ON v.id_product_group = bp.id_product_group
      AND v.base_product = 0
      AND v.deleted = 0
    LEFT JOIN cte_variant_option_agg voa ON voa.id_product_group = bp.id_product_group
    LEFT JOIN cte_category_product_unique vc ON vc.id = bp.id
    LEFT JOIN cte_product_images_grouped cpig ON cpig.id_product_group = bp.id_product_group
    LEFT JOIN cte_product_images cbppi ON cbppi.id_product = bp.id AND cbppi.image_num = 1
    LEFT JOIN cte_variants_grouped cv ON cv.id = bp.id
    LEFT JOIN cte_product_brand cppr ON cppr.productId = bp.id
    WHERE cpig.images IS NOT NULL
    GROUP BY bp.id, pl.title, pl.rewrite_title, pl.description, voa.option_values
  )
  SELECT * FROM cte_result
`
