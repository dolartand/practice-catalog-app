import { App as AntdApp, Button, Space } from 'antd';

import type { AdminOrderListItem } from '@entities/order';
import { useUpdateOrderStatus } from '@entities/order';
import type { OrderStatus } from '@shared/lib';
import { ORDER_STATUS_TRANSITIONS } from '@shared/lib';

interface OrderStatusActionsProps {
  order: Pick<AdminOrderListItem, 'id' | 'number' | 'status'>;
  size?: 'small' | 'middle';
  /** Основное действие — primary (в шапке карточки); в строке таблицы — обычная */
  primary?: boolean;
}

/** Следующий шаг воронки для не-терминального статуса */
const NEXT_ACTION: Partial<
  Record<OrderStatus, { target: OrderStatus; label: string; success: string }>
> = {
  NEW: { target: 'CONFIRMED', label: 'Подтвердить', success: 'Заказ подтверждён' },
  CONFIRMED: {
    target: 'DELIVERED',
    label: 'Отметить доставленным',
    success: 'Заказ отмечен доставленным',
  },
};

export function OrderStatusActions({ order, size = 'middle', primary = true }: OrderStatusActionsProps) {
  const { message, modal } = AntdApp.useApp();
  const updateStatus = useUpdateOrderStatus();

  const next = NEXT_ACTION[order.status];
  const canCancel = ORDER_STATUS_TRANSITIONS[order.status].includes('CANCELLED');

  // UI показывает только допустимые переходы; сервер валидирует независимо
  if (!next && !canCancel) return null;

  const confirmTo = (target: OrderStatus) => {
    modal.confirm({
      title: 'Отменить заказ?',
      content: `Заказ №${order.number} будет отменён. Остатки вернутся на склад. Действие необратимо.`,
      okText: 'Отменить заказ',
      okButtonProps: { danger: true },
      cancelText: 'Вернуться',
      onOk: async () => {
        await updateStatus.mutateAsync({ orderId: order.id, status: target });
        message.success('Заказ отменён');
      },
    });
  };

  const handleNext = async () => {
    if (!next) return;
    await updateStatus.mutateAsync({ orderId: order.id, status: next.target });
    message.success(next.success);
  };

  return (
    <Space size={size === 'small' ? 6 : 12}>
      {next && (
        <Button
          size={size}
          type={primary ? 'primary' : 'default'}
          loading={
            updateStatus.isPending &&
            updateStatus.variables?.orderId === order.id &&
            updateStatus.variables?.status === next.target
          }
          onClick={() => void handleNext()}
        >
          {next.label}
        </Button>
      )}
      {canCancel && (
        <Button
          size={size}
          danger
          loading={
            updateStatus.isPending &&
            updateStatus.variables?.orderId === order.id &&
            updateStatus.variables?.status === 'CANCELLED'
          }
          onClick={() => confirmTo('CANCELLED')}
        >
          Отменить
        </Button>
      )}
    </Space>
  );
}
