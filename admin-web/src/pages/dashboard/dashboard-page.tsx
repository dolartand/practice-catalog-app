import { Card, Col, Empty, Flex, Row, Space, Statistic, Tag, Typography } from 'antd';
import type { TagProps } from 'antd';

import { useDashboardStats } from '@features/dashboard-charts';
import type { DashboardStats } from '@features/dashboard-charts';
import { ORDER_STATUS_META } from '@shared/lib';
import { FullPageSpinner } from '@shared/ui';


function StatusCard({ title, value, color }: { title: string; value: number; color: TagProps['color'] }) {
  return (
    <Card size="small" variant="outlined" style={{ height: '100%' }}>
      <Flex justify="space-between" align="center">
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {title}
        </Typography.Text>
        <Tag color={color} style={{ margin: 0 }}>
          {value}
        </Tag>
      </Flex>
    </Card>
  );
}

/** Блок товаров */
function ProductStatsCard({ stats }: { stats: DashboardStats['products'] }) {
  const total = stats.ACTIVE + stats.INACTIVE + stats.DELETED;
  return (
    <Card title="Товары" size="small" style={{ height: '100%' }}>
      {total === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Товаров нет" />
      ) : (
        <Row gutter={[12, 8]} style={{ marginTop: 4 }}>
          <Col span={24}>
            <Statistic title="Всего" value={total} />
          </Col>
          <Col span={24}>
            <Space size="middle">
              <Tag color="green">Активных {stats.ACTIVE}</Tag>
              <Tag color="orange">Скрытых {stats.INACTIVE}</Tag>
              <Tag color="red">Удалённых {stats.DELETED}</Tag>
            </Space>
          </Col>
        </Row>
      )}
    </Card>
  );
}

/** Блок заказов */
function OrderStatsCard({ stats }: { stats: DashboardStats['orders'] }) {
  const total = Object.values(stats).reduce((sum, v) => sum + v, 0);
  if (total === 0) {
    return (
      <Card title="Заказы" size="small" style={{ height: '100%' }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Заказов пока нет" />
      </Card>
    );
  }

  return (
    <Card title="Заказы" size="small" style={{ height: '100%' }}>
      <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
        <Col span={24}>
          <Statistic title="Всего" value={total} />
        </Col>
        {(['NEW', 'CONFIRMED', 'DELIVERED', 'CANCELLED'] as const).map((status) => {
          const value = stats[status];
          if (value === 0) return null;
          return (
            <Col span={12} key={status}>
              <StatusCard
                title={ORDER_STATUS_META[status].label}
                value={value}
                color={ORDER_STATUS_META[status].color}
              />
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}

/** Блок отзывов */
function ReviewStatsCard({ stats }: { stats: DashboardStats['reviews'] }) {
  const total = stats.pending + stats.published;
  if (total === 0) {
    return (
      <Card title="Отзывы" size="small" style={{ height: '100%' }}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Отзывов нет" />
      </Card>
    );
  }

  return (
    <Card title="Отзывы" size="small" style={{ height: '100%' }}>
      <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
        <Col span={24}>
          <Statistic title="Всего" value={total} />
        </Col>
        <Col span={12}>
          <StatusCard title="На модерации" value={stats.pending} color="orange" />
        </Col>
        <Col span={12}>
          <StatusCard title="Опубликованы" value={stats.published} color="green" />
        </Col>
      </Row>
    </Card>
  );
}

export function DashboardPage() {
  const { data, isPending, isFetching, isError, error } = useDashboardStats();

  if (isPending) {
    return <FullPageSpinner />;
  }

  if (isError) {
    return (
      <Card title="Дашборд" variant="borderless">
        <Flex vertical align="center" gap={8} style={{ padding: 24 }}>
          <Typography.Text type="danger">
            Не удалось загрузить сводку: {error instanceof Error ? error.message : String(error)}
          </Typography.Text>
        </Flex>
      </Card>
    );
  }

  const stats = data!;

  return (
    <Card
      title="Дашборд"
      loading={isFetching && !isPending}
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Обновление каждые 60 сек
        </Typography.Text>
      }
    >
      <Row gutter={[24, 16]}>
        <Col xs={24} md={24} lg={8}>
          <ProductStatsCard stats={stats.products} />
        </Col>
        <Col xs={24} md={24} lg={8}>
          <OrderStatsCard stats={stats.orders} />
        </Col>
        <Col xs={24} md={24} lg={8}>
          <ReviewStatsCard stats={stats.reviews} />
        </Col>
      </Row>
    </Card>
  );
}
