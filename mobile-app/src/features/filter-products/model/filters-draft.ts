import type { ProductListParams, ProductSort } from '@entities/product';

export interface FiltersDraft {
  priceFrom: string; // строка — то, что реально лежит в TextInput
  priceTo: string;
  series: string;
  type: string | null;
  inStock: boolean;
  onlyDiscounted: boolean;
  sort: ProductSort;
}

export const EMPTY_DRAFT: FiltersDraft = {
  priceFrom: '',
  priceTo: '',
  series: '',
  type: null,
  inStock: false,
  onlyDiscounted: false,
  sort: 'newest',
};

// В API уходят копейки, пользователь вводит рубли (BYN) — конвертация в одном месте
export function draftToParams(draft: FiltersDraft): Partial<ProductListParams> {
  const params: Partial<ProductListParams> = {};

  if (draft.priceFrom.trim()) params.priceFrom = Math.round(Number(draft.priceFrom) * 100);
  if (draft.priceTo.trim()) params.priceTo = Math.round(Number(draft.priceTo) * 100);
  if (draft.series.trim()) params.series = draft.series.trim();
  if (draft.type) params.type = draft.type;
  if (draft.inStock) params.inStock = true;
  if (draft.onlyDiscounted) params.onlyDiscounted = true;
  if (draft.sort !== 'newest') params.sort = draft.sort;

  return params;
}

export function countActiveFilters(draft: FiltersDraft): number {
  let count = 0;
  if (draft.priceFrom.trim()) count += 1;
  if (draft.priceTo.trim()) count += 1;
  if (draft.series.trim()) count += 1;
  if (draft.type) count += 1;
  if (draft.inStock) count += 1;
  if (draft.onlyDiscounted) count += 1;
  if (draft.sort !== 'newest') count += 1;
  return count;
}