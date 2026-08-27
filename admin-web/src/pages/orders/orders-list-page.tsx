import { Card, Empty, Flex, Segmented, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type { AdminOrderListItem, AdminOrderListParams } from '@entities/order';
import { useOrdersQuery } from '@entities/order';
import { OrderStatusActions } from '@features/order-status-actions';
import {
  formatDateTime,
  formatMoney,
  isOrderStatus,
  ORDER_STATUS_META,
} from '@shared/lib';
import { FullPageSpinner } from '@shared/ui';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function OrdersListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Фильтр синхронизирован с URL — ссылку на таб можно шарить
  const statusParam = searchParams.get('status');
  const status = isOrderStatus(statusParam) ? statusParam : undefined;

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const params = useMemo<AdminOrderListParams>(
    () => ({ status, page, size }),
    [status, page, size],
  );

  const query = useOrdersQuery(params);

  const changeStatus = (next: string | number) => {
    setPage(0);
    setSearchParams(next === 'ALL' ? {} : { status: String(next) });
  };

  const columns: ColumnsType<AdminOrderListItem> = [
    {
      title: 'Номер',
      dataIndex: 'number',
      width: 170,
      render: (_, record) => (
        <Typography.Text
          code
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/orders/${record.id}`)}
        >
          {record.number}
        </Typography.Text>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      width: 140,
      render: (_, record) => (
        <Tag color={ORDER_STATUS_META[record.status].color}>
          {ORDER_STATUS_META[record.status].label}
        </Tag>
      ),
    },
    {
      title: 'Клиент',
      key: 'customer',
      render: (_, record) => (
        <Flex vertical>
          <Typography.Text>{record.customerName}</Typography.Text>
          <Typography.Text type="secondary">{record.customerPhone}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Позиций',
      dataIndex: 'itemCount',
      width: 100,
      align: 'right',
    },
    {
      title: 'Сумма',
      key: 'total',
      width: 150,
      render: (_, record) => (
        <Typography.Text strong>{formatMoney(record.totalCents)}</Typography.Text>
      ),
    },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      width: 180,
      render: (_, record) => formatDateTime(record.createdAt),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 280,
      align: 'right',
      render: (_, record) =>
        // stopPropagation — клик по действию не должен открывать строку
        (
          <Space onClick={(event) => event.stopPropagation()}>
            <OrderStatusActions order={record} size="small" primary={false} />
          </Space>
        ),
    },
  ];

  if (query.isPending) {
    return <FullPageSpinner />;
  }

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <Card
      title="Заказы"
      extra={
        <Segmented
          value={status ?? 'ALL'}
          onChange={(value) => changeStatus(value)}
          options={[
            { label: 'Все', value: 'ALL' },
            { label: ORDER_STATUS_META.NEW.label, value: 'NEW' },
            { label: ORDER_STATUS_META.CONFIRMED.label, value: 'CONFIRMED' },
            { label: ORDER_STATUS_META.DELIVERED.label, value: 'DELIVERED' },
            { label: ORDER_STATUS_META.CANCELLED.label, value: 'CANCELLED' },
          ]}
        />
      }
    >
      <Table<AdminOrderListItem>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={items}
        loading={query.isFetching}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: () => navigate(`/orders/${record.id}`),
        })}
        scroll={{ x: 1080 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                status ? `Заказов со статусом «${ORDER_STATUS_META[status].label}» нет` : 'Заказы пока отсутствуют'
              }
            />
          ),
        }}
        pagination={{
          current: page + 1,
          pageSize: size,
          total,
          pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
          showSizeChanger: true,
          showTotal: (t) => `Всего ${t}`,
          onChange: (nextPage, nextSize) => {
            if (nextSize !== size) {
              setSize(nextSize);
              setPage(0);
            } else {
              setPage(nextPage - 1);
            }
          },
        }}
      />
    </Card>
  );
}
