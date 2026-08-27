import {
  App as AntdApp,
  Button,
  Card,
  Empty,
  Flex,
  Rate,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';

import type { AdminReview, AdminReviewListParams } from '@entities/review';
import { useModerateReview, useReviewsQuery } from '@entities/review';
import { formatDateTime } from '@shared/lib';
import { FullPageSpinner } from '@shared/ui';

type QueueTab = 'pending' | 'published' | 'all';

const TAB_PARAMS: Record<QueueTab, AdminReviewListParams> = {
  pending: { isModerated: false },
  published: { isModerated: true },
  all: {},
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/** UUID до первого дефиса — если у автора вдруг нет email */
const shortId = (id: string) => id.slice(0, 8);

export function ReviewsPage() {
  const { message, modal } = AntdApp.useApp();

  const [tab, setTab] = useState<QueueTab>('pending');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const params = useMemo<AdminReviewListParams>(
    () => ({ ...TAB_PARAMS[tab], page, size }),
    [tab, page, size],
  );

  const query = useReviewsQuery(params);
  const moderate = useModerateReview();

  const approve = (review: AdminReview) => {
    void moderate
      .mutateAsync({ reviewId: review.id, productId: review.productId, isModerated: true })
      .then(() => message.success('Отзыв опубликован'));
  };

  const hide = (review: AdminReview) => {
    modal.confirm({
      title: 'Скрыть отзыв?',
      content:
        'Отзыв будет скрыт с витрины и исключён из рейтинга товара. Вернуть можно кнопкой «Одобрить».',
      okText: 'Скрыть',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        await moderate.mutateAsync({
          reviewId: review.id,
          productId: review.productId,
          isModerated: false,
        });
        message.success('Отзыв скрыт');
      },
    });
  };

  const columns: ColumnsType<AdminReview> = [
    {
      title: 'Товар',
      key: 'product',
      render: (_, record) =>
        record.productName ? (
          <Flex vertical style={{ minWidth: 0 }}>
            <Typography.Text ellipsis={{ tooltip: record.productName }}>
              {record.productName}
            </Typography.Text>
            {record.productArticle && (
              <Typography.Text code type="secondary">
                {record.productArticle}
              </Typography.Text>
            )}
          </Flex>
        ) : (
          <Typography.Text type="secondary">(товар недоступен)</Typography.Text>
        ),
    },
    {
      title: 'Автор',
      key: 'author',
      width: 220,
      render: (_, record) => (
        <Flex vertical>
          <Typography.Text>{record.userEmail ?? '—'}</Typography.Text>
          {(record.userFirstName || record.userLastName) && (
            <Typography.Text type="secondary">
              {[record.userFirstName, record.userLastName].filter(Boolean).join(' ')}
            </Typography.Text>
          )}
          {!record.userEmail && (
            <Typography.Text code type="secondary" style={{ fontSize: 12 }}>
              {shortId(record.userId)}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    {
      title: 'Оценка',
      dataIndex: 'rating',
      width: 150,
      render: (_, record) => (
        <Space size={6}>
          <Rate disabled value={record.rating} style={{ fontSize: 14 }} />
          <Typography.Text type="secondary">{record.rating}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Отзыв',
      key: 'text',
      render: (_, record) =>
        record.text ? (
          <Typography.Paragraph
            ellipsis={{ rows: 3, expandable: true, symbol: 'показать полностью' }}
            style={{ marginBottom: 0, maxWidth: 480 }}
          >
            {record.text}
          </Typography.Paragraph>
        ) : (
          <Typography.Text type="secondary">без текста</Typography.Text>
        ),
    },
    {
      title: 'Создан',
      dataIndex: 'createdAt',
      width: 170,
      render: (_, record) => formatDateTime(record.createdAt),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 150,
      render: (_, record) =>
        record.moderated ? (
          <Tag color="green">Опубликован</Tag>
        ) : (
          <Tag color="orange">На модерации</Tag>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 130,
      align: 'right',
      render: (_, record) =>
        record.moderated ? (
          <Button
            size="small"
            danger
            loading={moderate.isPending && moderate.variables?.reviewId === record.id}
            onClick={() => hide(record)}
          >
            Скрыть
          </Button>
        ) : (
          <Button
            size="small"
            type="primary"
            ghost
            loading={moderate.isPending && moderate.variables?.reviewId === record.id}
            onClick={() => approve(record)}
          >
            Одобрить
          </Button>
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
      title="Модерация отзывов"
      extra={
        <Segmented
          value={tab}
          onChange={(value) => {
            setTab(value as QueueTab);
            setPage(0);
          }}
          options={[
            { label: 'На модерации', value: 'pending' },
            { label: 'Опубликованные', value: 'published' },
            { label: 'Все', value: 'all' },
          ]}
        />
      }
    >
      <Table<AdminReview>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={items}
        loading={query.isFetching}
        scroll={{ x: 1080 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                tab === 'pending'
                  ? 'Очередь пуста — всё проверено'
                  : tab === 'published'
                    ? 'Опубликованных отзывов нет'
                    : 'Отзывов пока нет'
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
