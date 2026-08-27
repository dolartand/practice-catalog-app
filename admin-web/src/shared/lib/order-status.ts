import type { TagProps } from 'antd';

export type OrderStatus = 'NEW' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';

interface OrderStatusMeta {
  label: string;
  color: TagProps['color'];
}

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  NEW: { label: 'Новый', color: 'blue' },
  CONFIRMED: { label: 'Подтверждён', color: 'gold' },
  DELIVERED: { label: 'Доставлен', color: 'green' },
  CANCELLED: { label: 'Отменён', color: 'red' },
};

/** Матрица допустимых переходов бэкенда; UI показывает только эти варианты */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function isOrderStatus(value: string | null): value is OrderStatus {
  return value === 'NEW' || value === 'CONFIRMED' || value === 'DELIVERED' || value === 'CANCELLED';
}
