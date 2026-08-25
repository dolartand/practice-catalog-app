// Структурный аналог ProductSummaryResponse бэкенда (идентичен ProductListItem из
// entities/product — дублирование сознательное: entities не могут импортировать друг друга)
export interface FavoriteProduct {
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
