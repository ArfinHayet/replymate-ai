import { z } from 'zod';
import type { ProductListContext } from '../../../features/chat/product-list-context';
import {
  normalizeForMatching,
  parsePriceAmount,
  parseCriteriaNumber,
  parseRatingValue,
  parseDiscountPercent,
  parseReviewCount,
  parseAvailability,
  hasMatchingWordSet,
  hasNormalizedPhrase,
} from './visible-product-parsers';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const productListFilterCriteriaSchema = z.object({
  field: z.enum([
    'name',
    'price',
    'originalPrice',
    'discount',
    'rating',
    'reviewCount',
    'availability',
    'brand',
    'rawText',
  ]),
  operator: z.enum([
    'contains',
    'equals',
    'not_equals',
    'less_than',
    'less_than_or_equal',
    'greater_than',
    'greater_than_or_equal',
    'between',
  ]),
  value: z.union([z.string(), z.number()]).optional().describe(
    'Comparison value for single-value filters. Compact values like 10k are allowed.',
  ),
  min: z.union([z.string(), z.number()]).optional().describe(
    'Minimum value for between filters.',
  ),
  max: z.union([z.string(), z.number()]).optional().describe(
    'Maximum value for between filters.',
  ),
  label: z.string().optional().describe('Human-readable label for this filter.'),
});

export const productListCriteriaSchema = z.object({
  filters: z.array(productListFilterCriteriaSchema).optional(),
  sort: z.enum([
    'price_asc',
    'price_desc',
    'rating_desc',
    'rating_asc',
    'discount_desc',
    'reviewCount_desc',
    'none',
  ]).optional(),
  selection: z.enum(['single_best', 'all_matches']).optional(),
  label: z.string().optional().describe('Short label for card highlighting.'),
}).optional();

export type ProductListCriteria = NonNullable<z.infer<typeof productListCriteriaSchema>>;
export type ProductListFilterCriteria = NonNullable<ProductListCriteria['filters']>[number];
export type ProductListSort = NonNullable<ProductListCriteria['sort']>;

type VisibleProduct = ProductListContext['products'][number];
type CriterionMatch = 'match' | 'no_match' | 'unavailable';

// ─── Public helpers ───────────────────────────────────────────────────────────

export function hasProductListCriteria(
  criteria: ProductListCriteria | null | undefined,
): criteria is ProductListCriteria {
  return Boolean(
    criteria &&
      ((criteria.filters?.length ?? 0) > 0 ||
        (criteria.sort && criteria.sort !== 'none') ||
        criteria.selection ||
        criteria.label?.trim()),
  );
}

export function buildProductCriteriaLabel(criteria: ProductListCriteria): string {
  const explicitLabel = criteria.label?.trim();
  if (explicitLabel) return explicitLabel;

  const filterLabels = (criteria.filters ?? [])
    .map((filter) => filter.label?.trim() || buildProductFilterLabel(filter))
    .filter(Boolean);

  if (filterLabels.length > 0) return filterLabels.join(', ');
  if (criteria.sort && criteria.sort !== 'none') return buildProductSortLabel(criteria.sort);
  return 'matching products';
}

export function buildProductSortLabel(sort: ProductListSort): string {
  const labels: Record<ProductListSort, string> = {
    price_asc: 'cheapest product',
    price_desc: 'most expensive product',
    rating_desc: 'highest rated product',
    rating_asc: 'lowest rated product',
    discount_desc: 'biggest discount',
    reviewCount_desc: 'most reviewed product',
    none: 'matching products',
  };
  return labels[sort];
}

export function applyVisibleProductCriteria(
  products: VisibleProduct[],
  filters: ProductListFilterCriteria[],
): { matches: VisibleProduct[]; unavailableLabels: string[] } {
  if (filters.length === 0) return { matches: products, unavailableLabels: [] };

  const outcomes = filters.map((filter) => ({
    filter,
    statuses: products.map((product) => matchProductCriterion(product, filter)),
  }));

  const unavailableLabels = outcomes
    .filter((outcome) => outcome.statuses.every((status) => status === 'unavailable'))
    .map((outcome) => outcome.filter.label?.trim() || buildProductFilterLabel(outcome.filter));

  if (unavailableLabels.length > 0) {
    return { matches: [], unavailableLabels };
  }

  return {
    matches: products.filter((_, index) =>
      outcomes.every((outcome) => outcome.statuses[index] === 'match'),
    ),
    unavailableLabels: [],
  };
}

export function rankProductsByCriteria(
  products: VisibleProduct[],
  sort: ProductListSort | undefined,
): VisibleProduct[] {
  if (!sort || sort === 'none') return [];

  switch (sort) {
    case 'price_asc':
      return rankProductsByNumber(products, (p) => parsePriceAmount(p.price ?? p.rawText), 'asc');
    case 'price_desc':
      return rankProductsByNumber(products, (p) => parsePriceAmount(p.price ?? p.rawText), 'desc');
    case 'rating_desc':
      return rankProductsByNumber(products, (p) => parseRatingValue(p.rating ?? p.rawText), 'desc');
    case 'rating_asc':
      return rankProductsByNumber(products, (p) => parseRatingValue(p.rating ?? p.rawText), 'asc');
    case 'discount_desc':
      return rankProductsByNumber(products, (p) => parseDiscountPercent(p.discount ?? p.rawText), 'desc');
    case 'reviewCount_desc':
      return rankProductsByNumber(products, (p) => parseReviewCount(p.reviewCount ?? p.rawText), 'desc');
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildProductFilterLabel(filter: ProductListFilterCriteria): string {
  const value = filter.value !== undefined ? String(filter.value) : null;
  const min = filter.min !== undefined ? String(filter.min) : null;
  const max = filter.max !== undefined ? String(filter.max) : null;

  if (filter.operator === 'between') {
    return `${filter.field} between ${min ?? '?'} and ${max ?? '?'}`;
  }

  return [filter.field, filter.operator.replace(/_/g, ' '), value]
    .filter(Boolean)
    .join(' ');
}

function matchProductCriterion(
  product: VisibleProduct,
  filter: ProductListFilterCriteria,
): CriterionMatch {
  if (filter.operator === 'between') {
    return matchProductBetweenCriterion(product, filter);
  }

  const productValue = getProductComparableValue(product, filter.field);
  if (productValue === null) return 'unavailable';

  if (typeof productValue === 'number') {
    const target = parseCriteriaNumber(filter.value);
    if (target === null) return 'unavailable';
    return compareNumbers(productValue, target, filter.operator) ? 'match' : 'no_match';
  }

  const target = normalizeForMatching(String(filter.value ?? ''));
  if (!target) return 'unavailable';

  return compareProductText(productValue, target, filter.operator) ? 'match' : 'no_match';
}

function matchProductBetweenCriterion(
  product: VisibleProduct,
  filter: ProductListFilterCriteria,
): CriterionMatch {
  const productValue = getProductComparableValue(product, filter.field);
  const min = parseCriteriaNumber(filter.min);
  const max = parseCriteriaNumber(filter.max);

  if (typeof productValue !== 'number' || min === null || max === null) {
    return 'unavailable';
  }

  return productValue >= min && productValue <= max ? 'match' : 'no_match';
}

function getProductComparableValue(
  product: VisibleProduct,
  field: ProductListFilterCriteria['field'],
): string | number | null {
  switch (field) {
    case 'name':
      return product.name?.trim() || null;
    case 'price':
      return parsePriceAmount(product.price ?? product.rawText);
    case 'originalPrice':
      return parsePriceAmount(product.originalPrice ?? product.rawText);
    case 'discount':
      return parseDiscountPercent(product.discount ?? product.rawText);
    case 'rating':
      return parseRatingValue(product.rating ?? product.rawText);
    case 'reviewCount':
      return parseReviewCount(product.reviewCount ?? product.rawText);
    case 'availability':
      return parseAvailability(product.availability ?? product.rawText);
    case 'brand':
      return product.brand?.trim() || null;
    case 'rawText':
      return product.rawText ?? null;
  }
}

function compareProductText(
  productValue: string,
  target: string,
  operator: ProductListFilterCriteria['operator'],
): boolean {
  const normalizedProduct = normalizeForMatching(productValue);
  const contains =
    hasNormalizedPhrase(normalizedProduct, target) ||
    hasMatchingWordSet(normalizedProduct, target) ||
    normalizedProduct.includes(target);

  if (operator === 'not_equals') return !contains;
  if (operator === 'equals') return normalizedProduct === target;
  return contains;
}

function compareNumbers(
  productValue: number,
  target: number,
  operator: ProductListFilterCriteria['operator'],
): boolean {
  switch (operator) {
    case 'equals':
    case 'contains':
      return productValue === target;
    case 'not_equals':
      return productValue !== target;
    case 'less_than':
      return productValue < target;
    case 'less_than_or_equal':
      return productValue <= target;
    case 'greater_than':
      return productValue > target;
    case 'greater_than_or_equal':
      return productValue >= target;
    case 'between':
      return false;
  }
}

function rankProductsByNumber(
  products: VisibleProduct[],
  getValue: (product: VisibleProduct) => number | null,
  direction: 'asc' | 'desc',
): VisibleProduct[] {
  return products
    .map((product) => ({ product, value: getValue(product) }))
    .filter((item) => item.value !== null)
    .sort((a, b) => {
      if (a.value === null && b.value === null) return a.product.index - b.product.index;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return direction === 'asc' ? a.value - b.value : b.value - a.value;
    })
    .map((item) => item.product);
}
