import type { StorefrontCategory } from './data';

interface CatalogCategoryGroupDefinition {
  slug: string;
  title: string;
  description: string;
  childSlugs: string[];
  order: number;
  visual?: string;
}

export interface CatalogCategoryGroup {
  slug: string;
  title: string;
  description: string;
  order: number;
  visual: string | null;
  artworkUrl: string | null;
  subcategories: StorefrontCategory[];
}

const catalogGroupDefinitions: CatalogCategoryGroupDefinition[] = [
  {
    slug: 'apparel',
    title: 'Одежда',
    description: 'Базовые и сезонные вещи на каждый день',
    childSlugs: ['hoodies', 'jackets', 'tshirts', 'shirts', 'pants'],
    order: 10,
    visual: 'ОД',
  },
  {
    slug: 'footwear',
    title: 'Обувь',
    description: 'Повседневные пары и спортивные модели',
    childSlugs: ['sneakers', 'sport'],
    order: 20,
    visual: 'ОБ',
  },
  {
    slug: 'bags-accessories',
    title: 'Сумки и аксессуары',
    description: 'Сумки, рюкзаки и детали образа',
    childSlugs: ['bags', 'backpacks', 'accessories', 'travel'],
    order: 30,
    visual: 'SA',
  },
  {
    slug: 'home',
    title: 'Дом',
    description: 'Домашние сценарии, свет и кухня',
    childSlugs: ['home-living', 'lighting', 'kitchen', 'wellness'],
    order: 40,
    visual: 'Д',
  },
  {
    slug: 'tech',
    title: 'Техника',
    description: 'Аудио, зарядка и полезные гаджеты',
    childSlugs: ['audio', 'chargers', 'stationery'],
    order: 50,
    visual: 'Т',
  },
  {
    slug: 'gifts-family',
    title: 'Подарки и семья',
    description: 'Идеи для подарков и семейных покупок',
    childSlugs: ['kids', 'gifts'],
    order: 60,
    visual: 'GF',
  },
];

interface ResolvedGroupConfig {
  slug: string;
  title: string;
  description: string;
  order: number;
  visual: string | null;
  artworkUrl: string | null;
}

function normalizeGroupConfig(category: StorefrontCategory): ResolvedGroupConfig | null {
  const metadataSlug = category.catalogGroupSlug?.trim().toLowerCase() ?? '';

  if (metadataSlug) {
    return {
      slug: metadataSlug,
      title: category.catalogGroupTitle?.trim() || category.title,
      description: category.catalogGroupDescription?.trim() || category.description || 'Подкатегории раздела',
      order: category.catalogGroupOrder ?? category.sortOrder ?? 999,
      visual: category.catalogVisual?.trim() || null,
      artworkUrl: category.catalogGroupArtworkUrl?.trim() || null,
    };
  }

  const fallbackGroup = catalogGroupDefinitions.find((group) => group.childSlugs.includes(category.slug));
  if (fallbackGroup) {
    return {
      slug: fallbackGroup.slug,
      title: fallbackGroup.title,
      description: fallbackGroup.description,
      order: fallbackGroup.order,
      visual: fallbackGroup.visual ?? null,
      artworkUrl: null,
    };
  }

  if (!category.slug.trim()) {
    return null;
  }

  return {
    slug: category.slug,
    title: category.title,
    description: category.description || 'Откройте раздел и перейдите к товарам.',
    order: category.sortOrder ?? 999,
    visual: category.catalogVisual?.trim() || category.title.slice(0, 1),
    artworkUrl: category.catalogGroupArtworkUrl?.trim() || null,
  };
}

function sortSubcategories(categories: StorefrontCategory[]): StorefrontCategory[] {
  return [...categories].sort((left, right) => {
    const leftOrder = left.sortOrder ?? 0;
    const rightOrder = right.sortOrder ?? 0;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.title.localeCompare(right.title);
  });
}

export function buildCatalogCategoryGroups(categories: StorefrontCategory[]): CatalogCategoryGroup[] {
  const visibleCategories = categories.filter(
    (category) => category.id !== 'all' && category.catalogVisible !== false,
  );
  const groups = new Map<string, CatalogCategoryGroup>();

  visibleCategories.forEach((category) => {
    const config = normalizeGroupConfig(category);
    if (!config) {
      return;
    }

    const existing = groups.get(config.slug);
    if (!existing) {
      groups.set(config.slug, {
        slug: config.slug,
        title: config.title,
        description: config.description,
        order: config.order,
        visual: config.visual,
        artworkUrl: config.artworkUrl,
        subcategories: [category],
      });
      return;
    }

    existing.subcategories.push(category);

    if (
      config.order < existing.order ||
      (config.order === existing.order && config.title.localeCompare(existing.title) < 0)
    ) {
      existing.title = config.title;
      existing.description = config.description;
      existing.order = config.order;
      existing.visual = config.visual;
      existing.artworkUrl = config.artworkUrl;
    } else if (!existing.visual && config.visual) {
      existing.visual = config.visual;
    } else if (!existing.artworkUrl && config.artworkUrl) {
      existing.artworkUrl = config.artworkUrl;
    }
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      subcategories: sortSubcategories(group.subcategories),
    }))
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }
      return left.title.localeCompare(right.title);
    });
}

export function inferCatalogGroupSlug(categorySlug: string | null | undefined): string | null {
  if (!categorySlug) {
    return null;
  }

  const normalized = categorySlug.trim().toLowerCase();
  const match = catalogGroupDefinitions.find((group) => group.childSlugs.includes(normalized));
  return match?.slug ?? null;
}
