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
  /** Собственная цена SKU; null — наследует цену товара */
  priceCents: number | null;
  priceWithDiscountCents: number | null;
  /** Не объявлен в openapi SkuResponse, но возвращается бэкендом (ProductSkuResponse) */
  discountPercent?: number | null;
  stockQty: number;
  isActive: boolean;
}

// ── Запросы админа: SKU ───────────────────────────────────────────────────

export interface CreateSkuRequest {
  name: string;
  article: string;
  /** null — цена товара */
  priceCents?: number | null;
  discountPercent?: number;
  stockQty: number;
}

/** Частичное обновление SKU */
export interface UpdateSkuRequest {
  name?: string;
  priceCents?: number | null;
  discountPercent?: number;
  stockQty?: number;
  isActive?: boolean;
}

// ── Запросы админа: изображения ───────────────────────────────────────────

export interface UpdateImageRequest {
  position?: number;
  isMain?: boolean;
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
   /** Отсутствует (undefined) в JSON, когда у товара нет оценок — NON_NULL backend */
  ratingAverage: number | null;
  ratingCount: number;
  inStock: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  article: string;
  description: string | null;
  series: string | null;
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
   /** Отсутствует в JSON, когда нет оценок (backend NON_NULL) */
  ratingAverage: number | null;
  ratingCount: number;
  images: ProductImage[];
  skus: ProductSku[];
   /** Появляется в админ-карточке (GET /admin/products/{id}) */
   isActive?: boolean;
  /** Заполнен только у мягко удалённых товаров (админ-карточка) */
  deletedAt?: string | null;
}

export type ProductSort =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'rating_desc'
  | 'discount_desc';

export interface ProductListParams {
  page?: number;
  size?: number;
  q?: string;
  categoryId?: string;
  series?: string;
  type?: string;
  inStock?: boolean;
  onlyDiscounted?: boolean;
  sort?: ProductSort;
}

export type ProductsPage = PageEnvelope<ProductListItem>;

// ── Админский список и карточка (GET /admin/products, GET /admin/products/{id}) ──

/** Статус товара в админском списке */
export type ProductAdminStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED';

/**
 * Реальный контракт бэкенда (commit 7c1aaee):
 * series nullable, inStock отсутствует; есть isActive/deletedAt/createdAt.
 */
export interface AdminProductListItem {
  id: string;
  name: string;
  article: string;
  series: string | null;
  productType: string;
  priceCents: number;
  discountPercent: number | null;
  priceWithDiscountCents: number;
   mainImageUrl: string | null;
   /** Отсутствует в JSON, когда нет оценок (backend NON_NULL) */
  ratingAverage: number | null;
  ratingCount: number;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
}

/** Админский список поддерживает только q/categoryId/sort/page/size + status */
export interface AdminProductListParams {
  status?: ProductAdminStatus;
  q?: string;
  categoryId?: string;
  sort?: ProductSort;
  page?: number;
  size?: number;
}

export type AdminProductsPage = PageEnvelope<AdminProductListItem>;

/** Строка таблицы в зависимости от активного источника (флаг features.gaps.adminProductList) */
export type ProductListRow = ProductListItem | AdminProductListItem;

export type ProductListPage = PageEnvelope<ProductListRow>;

/** Параметры хука списка: публичные фильтры + статус для админской ветки */
export interface ProductListQuery extends ProductListParams {
  status?: ProductAdminStatus;
}

// ── Запросы админа (контракт openapi.yml) ─────────────────────────────────

export interface CreateProductRequest {
  categoryId: string;
  name: string;
  article: string;
  description?: string | null;
  series?: string | null;
  productType: string;
  decor?: string | null;
  material?: string | null;
  capacityMl?: number | null;
  weightG?: number | null;
  dimensions?: string | null;
  countryOfOrigin?: string | null;
  barcode?: string | null;
  priceCents: number;
  discountPercent?: number;
  isActive?: boolean;
}

/** Частичное обновление: все поля опциональны; скидку «снимают» значением 0 */
export type UpdateProductRequest = Partial<CreateProductRequest>;
