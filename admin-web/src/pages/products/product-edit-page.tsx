import { ArrowLeftOutlined, DeleteOutlined } from '@ant-design/icons';
import { Alert, App as AntdApp, Button, Flex, Result, Space, Tag, Tooltip } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useDeleteProduct, useProductQuery } from '@entities/product';
import { ImageManager } from '@features/image-manager';
import { ProductForm } from '@features/product-form';
import { SkuManager } from '@features/sku-manager';
import { parseApiError } from '@shared/api';
import { formatDateTime } from '@shared/lib';
import { FullPageSpinner, PageHeader } from '@shared/ui';

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = AntdApp.useApp();

  const query = useProductQuery(id ?? '');
  const deleteMutation = useDeleteProduct();

  if (query.isPending) {
    return <FullPageSpinner />;
  }

  if (query.isError) {
    const appError = parseApiError(query.error);
    const isNotFound = appError.kind === 'api' && appError.status === 404;
    return (
      <Result
        status={isNotFound ? '404' : 'error'}
        title={isNotFound ? 'Товар не найден' : 'Не удалось загрузить товар'}
        subTitle={
          isNotFound
            ? 'Проверьте ссылку: админ-карточка доступна для любого статуса, кроме полностью несуществующего id.'
            : 'Попробуйте обновить страницу позже.'
        }
        extra={
          <Button type="primary" onClick={() => navigate('/products')}>
            К списку товаров
          </Button>
        }
      />
    );
  }

  const product = query.data;

  const confirmDelete = () => {
    modal.confirm({
      title: 'Удалить товар?',
      content: `«${product.name}» будет скрыт из каталога. Пока админский список товаров не реализован на бэкенде, вернуть его через список нельзя.`,
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        await deleteMutation.mutateAsync(product.id);
        message.success('Товар удалён');
        navigate('/products', { replace: true });
      },
    });
  };

  const subtitleParts = [product.article, product.series].filter(Boolean).join(' · ');
  const isDeleted = product.deletedAt != null;
  const statusTag = isDeleted ? (
    <Tooltip title={`Удалён ${formatDateTime(product.deletedAt!)}`}>
      <Tag color="red">Удалён</Tag>
    </Tooltip>
  ) : product.isActive === false ? (
    <Tag color="orange">Скрыт</Tag>
  ) : null;

  return (
    <>
      <PageHeader
        title={
          <Space size={12}>
            {product.name}
            {statusTag}
          </Space>
        }
        subtitle={subtitleParts || undefined}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/products')}>
              К списку
            </Button>
            {!isDeleted && (
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
                onClick={confirmDelete}
              >
                Удалить
              </Button>
            )}
          </Space>
        }
      />
      {isDeleted && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Товар удалён"
          description="Карточка доступна только для просмотра: SKU и изображения скрыты, редактирование отключено."
        />
      )}
      <Flex vertical gap={16}>
        <ProductForm product={product} readOnly={isDeleted} />
        {!isDeleted && <SkuManager product={product} />}
        {!isDeleted && <ImageManager product={product} />}
      </Flex>
    </>
  );
}
