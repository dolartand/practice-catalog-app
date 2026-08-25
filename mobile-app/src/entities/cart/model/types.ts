export interface CartItem {
  id: string; // id позиции корзины — НЕ skuId, важно для PATCH/DELETE
  skuId: string;
  productName: string;
  skuName: string;
  article: string;
  priceCents: number;
  priceWithDiscountCents: number;
  quantity: number;
  totalCents: number;
  unavailable: boolean;
}

export interface Cart {
  items: CartItem[];
  totalCents: number; // сумма только по доступным позициям — так по контракту
}