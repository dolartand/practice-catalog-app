export type OrderStatus = 'NEW' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  skuId: string | null;
  productName: string;
  skuName: string;
  article: string;
  priceCents: number;
  priceWithDiscountCents: number;
  quantity: number;
  totalCents: number;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  itemsTotalCents: number;
  deliveryCents: number;
  totalCents: number;
  items: OrderItem[];
  createdAt: string;
}

export interface CreateOrderRequest {
  customerName: string;
  customerPhone: string;
  deliveryCity: string;
  deliveryAddress: string;
  comment?: string;
}