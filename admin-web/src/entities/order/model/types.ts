import type { PageEnvelope } from '@shared/lib';
import type { OrderStatus } from '@shared/lib';

/** Элемент списка оператора (GET /admin/orders) — без позиций и адреса */
export interface AdminOrderListItem {
  id: string;
  /** ORD-2026-000123 */
  number: string;
  userId: string;
  status: OrderStatus;
  itemsTotalCents: number;
  deliveryCents: number;
  totalCents: number;
  customerName: string;
  customerPhone: string;
  /** Число позиций (сами позиции — в деталях заказа) */
  itemCount: number;
  createdAt: string;
}

export type AdminOrdersPage = PageEnvelope<AdminOrderListItem>;

/** Позиция-снимок на момент оформления */
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

export interface StatusHistoryEntry {
  status: OrderStatus;
  /** Кто выполнил переход (пользователь или оператор) */
  byUserId: string;
  at: string;
}

/** Полные данные заказа для оператора (GET /admin/orders/{id}) */
export interface AdminOrderDetail extends AdminOrderListItem {
  deliveryCity: string;
  deliveryAddress: string;
  comment: string | null;
  items: OrderItem[];
  statusHistory: StatusHistoryEntry[];
}

export interface AdminOrderListParams {
  status?: OrderStatus;
  page?: number;
  size?: number;
}
