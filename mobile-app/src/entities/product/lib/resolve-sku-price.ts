import type { Product, ProductSku } from '../model/types';

export interface ResolvedPrice {
  priceCents: number;
  priceWithDiscountCents: number;
  hasDiscount: boolean;
}

export function resolveSkuPrice(product: Product, sku: ProductSku): ResolvedPrice {
  const priceCents = sku.priceCents ?? product.priceCents;
  const priceWithDiscountCents = sku.priceWithDiscountCents ?? product.priceWithDiscountCents;

  return {
    priceCents,
    priceWithDiscountCents,
    hasDiscount: priceWithDiscountCents < priceCents,
  };
}