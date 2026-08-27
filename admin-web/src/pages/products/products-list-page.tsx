import {
  DeleteOutlined,
  EditOutlined,
  PictureOutlined,
  PlusOutlined,
  SearchOutlined,
  StarFilled,
} from '@ant-design/icons';
import {
  Alert,
  App as AntdApp,
  Avatar,
  Button,
  Card,
  Checkbox,
  Flex,
  Input,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  TreeSelect,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { toCategoryTreeData, useCategoriesQuery } from '@entities/category';
import type {
  ProductAdminStatus,
  ProductListQuery,
  ProductListRow,
  ProductSort,
} from '@entities/product';
import { useDeleteProduct, useProductsQuery } from '@entities/product';
import { features } from '@shared/config';
import { formatDateTime, formatMoney, useDebouncedValue } from '@shared/lib';
import { FullPageSpinner, PageHeader } from '@shared/ui';

interface Filters {
  categoryId?: string;
  series?: string;
  type?: string;
  inStock?: boolean;
  onlyDiscounted?: boolean;
  sort?: ProductSort;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Сначала новые' },
  { value: 'price_asc', label: 'Цена: по возрастанию' },
  { value: 'price_desc', label: 'Цена: по убыванию' },
  { value: 'rating_desc', label: 'По рейтингу' },
  { value: 'discount_desc', label: 'По размеру скидки' },
] as const;

const STATUS_TABS = [
  { label: 'Активные', value: 'ACTIVE' },
  { label: 'Скрытые', value: 'INACTIVE' },
  { label: 'Удалённые', value: 'DELETED' },
] as const;

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function ProductsListPage() {
  const navigate = useNavigate();
  const { message, modal } = AntdApp.useApp();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductAdminStatus>('ACTIVE');
  const [filters, setFilters] = useState<Filters>({ sort: 'newest' });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const debouncedSearch = useDebouncedValue(search, 400);

  const { data: categories } = useCategoriesQuery();
  const deleteMutation = useDeleteProduct();

  const params = useMemo<ProductListQuery>(
    () => ({
      q: debouncedSearch.trim() || undefined,
      series: filters.series?.trim() || undefined,
      type: filters.type?.trim() || undefined,
      categoryId: filters.categoryId,
      inStock: filters.inStock,
      onlyDiscounted: filters.onlyDiscounted,
      sort: filters.sort ?? 'newest',
      status: features.gaps.adminProductList ? status : undefined,
      page,
      size,
    }),
    [
      debouncedSearch,
      status,
      filters.categoryId,
      filters.series,
      filters.type,
      filters.inStock,
      filters.onlyDiscounted,
      filters.sort,
      page,
      size,
    ],
  );

  const query = useProductsQuery(params);

  const applyFilters = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(0);
  };

  const isRowDeleted = (record: ProductListRow) =>
    'deletedAt' in record && record.deletedAt != null;

  const confirmDelete = (record: ProductListRow) => {
    if (isRowDeleted(record)) return;
    modal.confirm({
      title: 'Удалить товар?',
      content: `«${record.name}» будет скрыт из публичного каталога. Товар останется в списке «Удалённые».`,
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        await deleteMutation.mutateAsync(record.id);
        message.success('Товар удалён');
      },
    });
  };

  const columns: ColumnsType<ProductListRow> = [
    {
      title: 'Товар',
      key: 'name',
      render: (_, record) => (
        <Flex gap={12} align="center">
          <Avatar shape="square" size={48} src={record.mainImageUrl} icon={<PictureOutlined />} />
          <Flex vertical style={{ minWidth: 0 }}>
            <Typography.Text
              strong
              ellipsis={{ tooltip: record.name }}
              style={{ cursor: 'pointer', maxWidth: 420 }}
              onClick={() => navigate(`/products/${record.id}`)}
            >
              {record.name}
            </Typography.Text>
            <Typography.Text type="secondary">{record.article}</Typography.Text>
          </Flex>
        </Flex>
      ),
    },
    { title: 'Серия', dataIndex: 'series', width: 140, ellipsis: true },
    { title: 'Тип', dataIndex: 'productType', width: 130, ellipsis: true },
    {
      title: 'Цена',
      key: 'price',
      width: 160,
      render: (_, record) =>
        record.discountPercent ? (
          <Flex vertical>
            <Typography.Text>{formatMoney(record.priceWithDiscountCents)}</Typography.Text>
            <Typography.Text delete type="secondary">
              {formatMoney(record.priceCents)}
            </Typography.Text>
          </Flex>
        ) : (
          formatMoney(record.priceWithDiscountCents)
        ),
    },
    {
      title: 'Рейтинг',
      key: 'rating',
      width: 120,
      render: (_, record) => {
        if (record.ratingAverage == null) {
          return <Typography.Text type="secondary">нет оценок</Typography.Text>;
        }
        return (
          <Space size={4}>
            <StarFilled style={{ color: '#faad14' }} />
            <Typography.Text>{record.ratingAverage.toFixed(1)}</Typography.Text>
            <Typography.Text type="secondary">({record.ratingCount})</Typography.Text>
          </Space>
        );
      },
    },
    {
      title: 'Наличие',
      dataIndex: 'inStock',
      width: 130,
      render: (_: unknown, record) =>
        'inStock' in record ? (
          record.inStock ? (
            <Tag color="green">В наличии</Tag>
          ) : (
            <Tag color="red">Нет в наличии</Tag>
          )
        ) : (
          '—'
        ),
    },
    ...(features.gaps.adminProductList
      ? [
          {
            title: 'Статус',
            key: 'status',
            width: 130,
            render: (_: unknown, record: ProductListRow) => {
              if (!('isActive' in record)) return null;
              if (record.deletedAt) {
                return (
                  <Tooltip title={`Удалён ${formatDateTime(record.deletedAt)}`}>
                    <Tag color="red">Удалён</Tag>
                  </Tooltip>
                );
              }
              return record.isActive ? (
                <Tag color="green">Активен</Tag>
              ) : (
                <Tooltip title="Скрыт из публичного каталога; включите в карточке товара">
                  <Tag color="orange">Скрыт</Tag>
                </Tooltip>
              );
            },
          } satisfies ColumnsType<ProductListRow>[number],
        ]
      : []),
    {
      title: '',
      key: 'actions',
      width: 110,
      align: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/products/${record.id}`)}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={isRowDeleted(record)}
            loading={deleteMutation.isPending && deleteMutation.variables === record.id}
            onClick={() => confirmDelete(record)}
          />
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
    <>
      <PageHeader
        title="Товары"
        subtitle={`Всего: ${total}`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/products/new')}>
            Создать товар
          </Button>
        }
      />

      {!features.gaps.adminProductList && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Показаны только активные товары"
          description="Неактивные и удалённые товары появятся в списке после реализации админского списка на бэкенде (docs/frontend/web/03 §6.1)."
        />
      )}

      <Card>
        {features.gaps.adminProductList && (
          <Segmented
            style={{ marginBottom: 16 }}
            value={status}
            onChange={(value) => {
              setStatus(value as ProductAdminStatus);
              setPage(0);
            }}
            options={[...STATUS_TABS]}
          />
        )}
        <Flex gap={12} wrap style={{ marginBottom: 16 }} align="center">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Поиск: название, артикул, серия"
            style={{ width: 260 }}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
          <TreeSelect
            allowClear
            treeDefaultExpandAll
            treeData={toCategoryTreeData(categories ?? [])}
            treeNodeFilterProp="title"
            showSearch
            placeholder="Категория"
            style={{ width: 220 }}
            value={filters.categoryId}
            onChange={(value) => applyFilters({ categoryId: value ?? undefined })}
          />
          <Input
            allowClear
            placeholder="Серия"
            style={{ width: 150 }}
            value={filters.series}
            onChange={(e) => applyFilters({ series: e.target.value })}
          />
          <Input
            allowClear
            placeholder="Тип изделия"
            style={{ width: 150 }}
            value={filters.type}
            onChange={(e) => applyFilters({ type: e.target.value })}
          />
          <Checkbox
            checked={filters.inStock}
            onChange={(e) => applyFilters({ inStock: e.target.checked || undefined })}
          >
            В наличии
          </Checkbox>
          <Checkbox
            checked={filters.onlyDiscounted}
            onChange={(e) => applyFilters({ onlyDiscounted: e.target.checked || undefined })}
          >
            Со скидкой
          </Checkbox>
          <Select
            options={[...SORT_OPTIONS]}
            style={{ width: 200 }}
            value={filters.sort ?? 'newest'}
            onChange={(value) => applyFilters({ sort: value })}
          />
        </Flex>

        <Table<ProductListRow>
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={query.isFetching}
          scroll={{ x: 1080 }}
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
    </>
  );
}
