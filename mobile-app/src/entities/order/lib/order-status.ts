import type { OrderStatus } from '../model/types';

export const ORDER_STATUS_COLOR_KEY: Record<OrderStatus, 'accent' | 'primary' | 'success' | 'danger'> = {
  NEW: 'accent',
  CONFIRMED: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};