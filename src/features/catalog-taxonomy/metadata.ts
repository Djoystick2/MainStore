import type { Json } from '@/types/db';

interface TaxonomyMetadataShape {
  short_text?: string;
  display_order?: number;
  is_featured?: boolean;
  catalog_group_slug?: string;
  catalog_group_title?: string;
  catalog_group_description?: string;
  catalog_group_order?: number;
  catalog_visible?: boolean;
  catalog_visual?: string;
  catalog_group_artwork_url?: string;
}

export interface ParsedTaxonomyMetadata {
  shortText: string | null;
  displayOrder: number;
  isFeatured: boolean;
  catalogGroupSlug: string | null;
  catalogGroupTitle: string | null;
  catalogGroupDescription: string | null;
  catalogGroupOrder: number;
  catalogVisible: boolean;
  catalogVisual: string | null;
  catalogGroupArtworkUrl: string | null;
}

function isRecord(value: Json): value is Record<string, Json | undefined> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseTaxonomyMetadata(metadata: Json): ParsedTaxonomyMetadata {
  if (!isRecord(metadata)) {
    return {
      shortText: null,
      displayOrder: 0,
      isFeatured: false,
      catalogGroupSlug: null,
      catalogGroupTitle: null,
      catalogGroupDescription: null,
      catalogGroupOrder: 0,
      catalogVisible: true,
      catalogVisual: null,
      catalogGroupArtworkUrl: null,
    };
  }

  const shape = metadata as TaxonomyMetadataShape;

  return {
    shortText:
      typeof shape.short_text === 'string' && shape.short_text.trim()
        ? shape.short_text.trim()
        : null,
    displayOrder:
      typeof shape.display_order === 'number' && Number.isFinite(shape.display_order)
        ? Math.trunc(shape.display_order)
        : 0,
    isFeatured: shape.is_featured === true,
    catalogGroupSlug:
      typeof shape.catalog_group_slug === 'string' && shape.catalog_group_slug.trim()
        ? shape.catalog_group_slug.trim()
        : null,
    catalogGroupTitle:
      typeof shape.catalog_group_title === 'string' && shape.catalog_group_title.trim()
        ? shape.catalog_group_title.trim()
        : null,
    catalogGroupDescription:
      typeof shape.catalog_group_description === 'string' && shape.catalog_group_description.trim()
        ? shape.catalog_group_description.trim()
        : null,
    catalogGroupOrder:
      typeof shape.catalog_group_order === 'number' && Number.isFinite(shape.catalog_group_order)
        ? Math.trunc(shape.catalog_group_order)
        : 0,
    catalogVisible: shape.catalog_visible !== false,
    catalogVisual:
      typeof shape.catalog_visual === 'string' && shape.catalog_visual.trim()
        ? shape.catalog_visual.trim().slice(0, 24)
        : null,
    catalogGroupArtworkUrl:
      typeof shape.catalog_group_artwork_url === 'string' && shape.catalog_group_artwork_url.trim()
        ? shape.catalog_group_artwork_url.trim().slice(0, 2000)
        : null,
  };
}

export function buildTaxonomyMetadata(input: {
  shortText?: string | null;
  displayOrder?: number;
  isFeatured?: boolean;
  catalogGroupSlug?: string | null;
  catalogGroupTitle?: string | null;
  catalogGroupDescription?: string | null;
  catalogGroupOrder?: number;
  catalogVisible?: boolean;
  catalogVisual?: string | null;
  catalogGroupArtworkUrl?: string | null;
}): Json {
  return {
    short_text: input.shortText?.trim() ? input.shortText.trim().slice(0, 180) : null,
    display_order:
      typeof input.displayOrder === 'number' && Number.isFinite(input.displayOrder)
        ? Math.trunc(input.displayOrder)
        : 0,
    is_featured: input.isFeatured === true,
    catalog_group_slug: input.catalogGroupSlug?.trim()
      ? input.catalogGroupSlug.trim().slice(0, 120)
      : null,
    catalog_group_title: input.catalogGroupTitle?.trim()
      ? input.catalogGroupTitle.trim().slice(0, 160)
      : null,
    catalog_group_description: input.catalogGroupDescription?.trim()
      ? input.catalogGroupDescription.trim().slice(0, 240)
      : null,
    catalog_group_order:
      typeof input.catalogGroupOrder === 'number' && Number.isFinite(input.catalogGroupOrder)
        ? Math.trunc(input.catalogGroupOrder)
        : 0,
    catalog_visible: input.catalogVisible !== false,
    catalog_visual: input.catalogVisual?.trim()
      ? input.catalogVisual.trim().slice(0, 24)
      : null,
    catalog_group_artwork_url: input.catalogGroupArtworkUrl?.trim()
      ? input.catalogGroupArtworkUrl.trim().slice(0, 2000)
      : null,
  };
}
