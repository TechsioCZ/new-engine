import * as migration_20260125_215246_baseline from './20260125_215246_baseline';
import * as migration_20260714_142450_add_hero_carousel_internal_title from './20260714_142450_add_hero_carousel_internal_title';
import * as migration_20260730_195416_add_article_category_model from './20260730_195416_add_article_category_model';
import * as migration_20260731_135408_add_article_related_articles from './20260731_135408_add_article_related_articles';
import * as migration_20260731_175339_add_article_authors from './20260731_175339_add_article_authors';
import * as migration_20260813_065411_add_article_sidebar from './20260813_065411_add_article_sidebar';
import * as migration_20260817_132825_add_footer_navigation from './20260817_132825_add_footer_navigation';

export const migrations = [
  {
    up: migration_20260125_215246_baseline.up,
    down: migration_20260125_215246_baseline.down,
    name: '20260125_215246_baseline',
  },
  {
    up: migration_20260714_142450_add_hero_carousel_internal_title.up,
    down: migration_20260714_142450_add_hero_carousel_internal_title.down,
    name: '20260714_142450_add_hero_carousel_internal_title',
  },
  {
    up: migration_20260730_195416_add_article_category_model.up,
    down: migration_20260730_195416_add_article_category_model.down,
    name: '20260730_195416_add_article_category_model',
  },
  {
    up: migration_20260731_135408_add_article_related_articles.up,
    down: migration_20260731_135408_add_article_related_articles.down,
    name: '20260731_135408_add_article_related_articles',
  },
  {
    up: migration_20260731_175339_add_article_authors.up,
    down: migration_20260731_175339_add_article_authors.down,
    name: '20260731_175339_add_article_authors',
  },
  {
    up: migration_20260813_065411_add_article_sidebar.up,
    down: migration_20260813_065411_add_article_sidebar.down,
    name: '20260813_065411_add_article_sidebar',
  },
  {
    up: migration_20260817_132825_add_footer_navigation.up,
    down: migration_20260817_132825_add_footer_navigation.down,
    name: '20260817_132825_add_footer_navigation'
  },
];
