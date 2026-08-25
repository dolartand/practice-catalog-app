import type { PageEnvelope } from '@shared/lib';

export interface ProductImage {
  id: string;
  url: string;
  position: number;
  isMain: boolean;
}

export interface ProductSku {
  id: string;
  name: string;
  article: string;
  priceCents: number | null;
  priceWithDiscountCents: number | null;
  stockQty: number;
  isActive: boolean;
}

export interface ProductListItem {
  id: string;
  name: string;
  article: string;
  series: string;
  productType: string;
  priceCents: number;
  discountPercent: number | null;
  priceWithDiscountCents: number;
  mainImageUrl: string | null;
  ratingAverage: number;
  ratingCount: number;
  inStock: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  article: string;
  description: string | null;
  series: string;
  productType: string;
  decor: string | null;
  material: string | null;
  capacityMl: number | null;
  weightG: number | null;
  dimensions: string | null;
  countryOfOrigin: string | null;
  barcode: string | null;
  priceCents: number;
  discountPercent: number | null;
  priceWithDiscountCents: number;
  ratingAverage: number;
  ratingCount: number;
  images: ProductImage[];
  skus: ProductSku[];
}

export type ProductSort = 'price_asc' | 'price_desc' | 'rating_desc' | 'newest' | 'discount_desc';

export interface ProductListParams {
  page?: number;
  size?: number;
  q?: string;
  categoryId?: string;
  priceFrom?: number;
  priceTo?: number;
  series?: string;
  type?: string;
  inStock?: boolean;
  onlyDiscounted?: boolean;
  sort?: ProductSort;
}

export type ProductsPage = PageEnvelope<ProductListItem>;