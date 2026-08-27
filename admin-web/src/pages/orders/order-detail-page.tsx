import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Card, Col, Descriptions, Flex, Result, Row, Space, Table, Tag, Timeline, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useParams } from 'react-router-dom';

import type { AdminOrderDetail, OrderItem } from '@entities/order';
import { useOrderQuery } from '@entities/order';
import { OrderStatusActions } from '@features/order-status-actions';
import { parseApiError } from '@shared/api';
import {
  formatDateTime,
  formatMoney,
  ORDER_STATUS_META,
} from '@shared/lib';
import { FullPageSpinner, PageHeader } from '@shared/ui';

const HISTORY_COLOR: Record<AdminOrderDetail['status'], string> = {
  NEW: 'blue',
  CONFIRMED: '#faad14',
  DELIVERED: 'green',
  CANCELLED: 'red',
};

/** UUID до первого дефиса — кто выполнил переход (эндпоинта пользователей нет) */
const shortId = (id: string) => id.slice(0, 8);

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const query = useOrderQuery(id ?? '');

  if (query.isPending) {
    return <FullPageSpinner />;
  }

  if (query.isError) {
    const appError = parseApiError(query.error);
    const isNotFound = appError.kind === 'api' && appError.status === 404;
    return (
      <Result
        status={isNotFound ? '404' : 'error'}
        title={isNotFound ? 'Заказ не найден' : 'Не удалось загрузить заказ'}
        extra={
          <Button type="primary" onClick={() => navigate('/orders')}>
            К списку заказов
          </Button>
        }
      />
    );
  }

  const order = query.data;

  const itemColumns: ColumnsType<OrderItem> = [
    {
      title: 'Товар',
      key: 'product',
      render: (_, record) => (
        <Flex vertical>
          <Typography.Text>{record.productName}</Typography.Text>
          <Typography.Text type="secondary">{record.skuName}</Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Артикул',
      dataIndex: 'article',
      width: 150,
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    {
      title: 'Цена',
      key: 'price',
      width: 140,
      align: 'right',
      render: (_, record) => formatMoney(record.priceWithDiscountCents),
    },
    {
      title: 'Кол-во',
      dataIndex: 'quantity',
      width: 90,
      align: 'right',
    },
    {
      title: 'Сумма',
      key: 'total',
      width: 140,
      align: 'right',
      render: (_, record) => <Typography.Text strong>{formatMoney(record.totalCents)}</Typography.Text>,
    },
  ];

  return (
    <>
      <PageHeader
        title={
          <Space size={12}>
            <Typography.Text code style={{ fontSize: 20 }}>
              {order.number}
            </Typography.Text>
            <Tag color={ORDER_STATUS_META[order.status].color}>
              {ORDER_STATUS_META[order.status].label}
            </Tag>
          </Space>
        }
        subtitle={`Создан ${formatDateTime(order.createdAt)}`}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
              К списку
            </Button>
            <OrderStatusActions order={order} />
          </Space>
        }
      />

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Flex vertical gap={16}>
            <Card title="Состав заказа" styles={{ body: { paddingTop: 0 } }}>
              <Table<OrderItem>
                rowKey="id"
                size="small"
                columns={itemColumns}
                dataSource={order.items}
                pagination={false}
                locale={{ emptyText: 'Позиции недоступны' }}
              />
              <Descriptions
                column={1}
                size="small"
                style={{ marginTop: 16, maxWidth: 360, marginLeft: 'auto' }}
                items={[
                  {
                    key: 'items',
                    label: 'Товары',
                    children: formatMoney(order.itemsTotalCents),
                  },
                  {
                    key: 'delivery',
                    label: 'Доставка',
                    children:
                      order.deliveryCents > 0
                        ? formatMoney(order.deliveryCents)
                        : `${formatMoney(0)} (бесплатно)`,
                  },
                  {
                    key: 'total',
                    label: <Typography.Text strong>Итого</Typography.Text>,
                    children: (
                      <Typography.Text strong>{formatMoney(order.totalCents)}</Typography.Text>
                    ),
                  },
                ]}
              />
            </Card>

            <Card title="История статусов">
              <Timeline
                items={[...order.statusHistory]
                  .sort((a, b) => a.at.localeCompare(b.at))
                  .map((entry) => ({
                    color: HISTORY_COLOR[entry.status],
                    children: (
                      <Flex vertical>
                        <Space size={8}>
                          <Tag color={ORDER_STATUS_META[entry.status].color}>
                            {ORDER_STATUS_META[entry.status].label}
                          </Tag>
                          <Typography.Text type="secondary">
                            {formatDateTime(entry.at)}
                          </Typography.Text>
                        </Space>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          инициатор: {shortId(entry.byUserId)}
                        </Typography.Text>
                      </Flex>
                    ),
                  }))}
              />
            </Card>
          </Flex>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Получатель и доставка">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Имя">{order.customerName}</Descriptions.Item>
              <Descriptions.Item label="Телефон">
                <Typography.Text copyable>{order.customerPhone}</Typography.Text>
              </Descriptions.Item>
              <Descriptions.Item label="Город">{order.deliveryCity}</Descriptions.Item>
              <Descriptions.Item label="Адрес">{order.deliveryAddress}</Descriptions.Item>
            </Descriptions>
            {order.comment && (
              <>
                <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 4 }}>
                  Комментарий клиента
                </Typography.Paragraph>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  {order.comment}
                </Typography.Paragraph>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
