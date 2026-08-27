import {
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Row, Switch,
  TreeSelect,
  Typography,
} from 'antd';
import type { NamePath } from 'antd/es/form/interface';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { toCategoryTreeData, useCategoriesQuery } from '@entities/category';
import type { Product } from '@entities/product';
import { useCreateProduct, useUpdateProduct } from '@entities/product';
import { parseApiError } from '@shared/api';
import { features } from '@shared/config';
import { calculateDiscountedCents, formatMoney, getFeedback, showErrorToast } from '@shared/lib';
import { MoneyInput } from '@shared/ui';

interface ProductFormProps {
  product?: Product;
  /** Только просмотр (мягко удалённый товар) */
  readOnly?: boolean;
}

interface ProductFormValues {
  categoryId: string;
  name: string;
  article: string;
  description?: string;
  series?: string;
  productType: string;
  decor?: string;
  material?: string;
  capacityMl?: number | null;
  weightG?: number | null;
  dimensions?: string;
  countryOfOrigin?: string;
  barcode?: string;
  priceCents: number;
  discountPercent?: number | null;
  isActive: boolean;
}

/** Пустая строка → null (бэкенд хранит nullable-текст) */
const textOrNull = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

function toFormValues(product: Product): ProductFormValues {
  return {
    categoryId: product.categoryId,
    name: product.name,
    article: product.article,
    description: product.description ?? undefined,
    series: product.series ?? undefined,
    productType: product.productType,
    decor: product.decor ?? undefined,
    material: product.material ?? undefined,
    capacityMl: product.capacityMl,
    weightG: product.weightG,
    dimensions: product.dimensions ?? undefined,
    countryOfOrigin: product.countryOfOrigin ?? undefined,
    barcode: product.barcode ?? undefined,
    priceCents: product.priceCents,
    discountPercent: product.discountPercent ?? undefined,
    // До включения admin-карточки флаг в ответе отсутствует; публичный товар всегда активен
    isActive: product.isActive ?? true,
  };
}

function buildCreatePayload(values: ProductFormValues) {
  return {
    categoryId: values.categoryId,
    name: values.name.trim(),
    article: values.article.trim(),
    description: textOrNull(values.description),
    series: textOrNull(values.series),
    productType: values.productType.trim(),
    decor: textOrNull(values.decor),
    material: textOrNull(values.material),
    capacityMl: values.capacityMl ?? null,
    weightG: values.weightG ?? null,
    dimensions: textOrNull(values.dimensions),
    countryOfOrigin: textOrNull(values.countryOfOrigin),
    barcode: textOrNull(values.barcode),
    priceCents: values.priceCents,
    ...(values.discountPercent != null && values.discountPercent > 0
      ? { discountPercent: values.discountPercent }
      : {}),
    isActive: values.isActive,
  };
}

/**
 * PATCH отправляет только изменённые поля (docs/frontend/web/05-catalog.md §2).
 * Скидку нельзя очистить null'ом — «снимается» значением 0 (контракт openapi).
 */
function buildUpdatePayload(product: Product, values: ProductFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const pushText = (field: keyof Product & keyof ProductFormValues) => {
    const next = textOrNull(values[field] as string | undefined);
    const original = (product[field] as string | null) ?? null;
    if (next !== original) payload[field] = next;
  };
  const pushNumber = (field: 'capacityMl' | 'weightG') => {
    const next = values[field] ?? null;
    if (next !== product[field]) payload[field] = next;
  };

  pushText('name');
  pushText('article');
  pushText('description');
  pushText('series');
  pushText('decor');
  pushText('material');
  pushText('dimensions');
  pushText('countryOfOrigin');
  pushText('barcode');
  pushNumber('capacityMl');
  pushNumber('weightG');

  const nextProductType = textOrNull(values.productType);
  if (nextProductType !== product.productType) {
    payload['productType'] = nextProductType;
  }
  if (values.categoryId !== product.categoryId) {
    payload['categoryId'] = values.categoryId;
  }
  if (values.priceCents !== product.priceCents) {
    payload['priceCents'] = values.priceCents;
  }
  const nextDiscount = values.discountPercent ?? 0;
  if (nextDiscount !== (product.discountPercent ?? 0)) {
    payload['discountPercent'] = nextDiscount;
  }
  if (values.isActive !== (product.isActive ?? true)) {
    payload['isActive'] = values.isActive;
  }

  return payload;
}

export function ProductForm({ product, readOnly = false }: ProductFormProps) {
  const navigate = useNavigate();
  const [form] = Form.useForm<ProductFormValues>();
  const { message } = getFeedback();

  const { data: categories } = useCategoriesQuery();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const priceCents = Form.useWatch('priceCents', form);
  const discountPercent = Form.useWatch('discountPercent', form);

  // Редактируемый товар мог загрузиться после первого рендера формы
  useEffect(() => {
    if (product) form.setFieldsValue(toFormValues(product));
  }, [product, form]);

  const submitting = createMutation.isPending || updateMutation.isPending;

  const handleError = (error: unknown) => {
    const appError = parseApiError(error);
    if (appError.kind === 'api') {
      const entries = Object.entries(appError.fieldErrors);
      if (entries.length > 0) {
        form.setFields(
          entries.map(([name, errors]) => ({
            name: name as NamePath<ProductFormValues>,
            errors,
          })),
        );
        return;
      }
    }
    showErrorToast(error, 'Не удалось сохранить товар');
  };

  const onFinish = async (values: ProductFormValues) => {
    try {
      if (product) {
        await updateMutation.mutateAsync({
          id: product.id,
          payload: buildUpdatePayload(product, values),
        });
        message.success('Товар сохранён');
      } else {
        const created = await createMutation.mutateAsync(buildCreatePayload(values));
        message.success('Товар создан');
        navigate(`/products/${created.id}`, { replace: true });
      }
    } catch (error) {
      handleError(error);
    }
  };

  const discountedPreview =
    priceCents != null && discountPercent != null && discountPercent > 0
      ? formatMoney(calculateDiscountedCents(priceCents, discountPercent))
      : null;

  return (
    <Card>
      <Form<ProductFormValues>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        disabled={submitting || readOnly}
        initialValues={{ isActive: !product }}
      >
        <Typography.Title level={5}>Основное</Typography.Title>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="categoryId"
              label="Категория"
              rules={[{ required: true, message: 'Выберите категорию' }]}
            >
              <TreeSelect
                showSearch
                allowClear
                treeDefaultExpandAll
                treeNodeFilterProp="title"
                placeholder="Выберите категорию"
                treeData={toCategoryTreeData(categories ?? [])}
                loading={categories == null}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="article"
              label="Артикул"
              rules={[
                { required: true, message: 'Введите артикул' },
                { max: 64, message: 'Максимум 64 символа' },
              ]}
            >
              <Input placeholder="CS-1001" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name="name"
          label="Название"
          rules={[
            { required: true, message: 'Введите название' },
            { max: 300, message: 'Максимум 300 символов' },
          ]}
        >
          <Input placeholder="Чайный сервиз «Славянский» на 6 персон" />
        </Form.Item>
        <Form.Item name="description" label="Описание">
          <Input.TextArea autoSize={{ minRows: 3 }} />
        </Form.Item>

        <Divider />
        <Typography.Title level={5}>Классификация</Typography.Title>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="series" label="Серия">
              <Input maxLength={200} placeholder="Славянский" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="productType"
              label="Тип изделия"
              rules={[
                { required: true, message: 'Введите тип изделия' },
                { max: 100, message: 'Максимум 100 символов' },
              ]}
            >
              <Input placeholder="сервиз" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="material" label="Материал">
              <Input maxLength={100} placeholder="твёрдый фарфор" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="decor" label="Декор">
          <Input maxLength={200} placeholder="синий кобальт" />
        </Form.Item>

        <Divider />
        <Typography.Title level={5}>Габариты и вес</Typography.Title>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="capacityMl" label="Вместимость, мл">
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="weightG" label="Вес, г">
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="dimensions" label="Габариты">
              <Input maxLength={100} placeholder="310x210x180 мм" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="countryOfOrigin" label="Страна происхождения">
              <Input maxLength={100} placeholder="Беларусь" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="barcode" label="Штрихкод" style={{ maxWidth: 320 }}>
          <Input maxLength={32} />
        </Form.Item>

        <Divider />
        <Typography.Title level={5}>Цена</Typography.Title>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="priceCents"
              label="Цена"
              rules={[{ required: true, message: 'Введите цену' }]}
            >
              <MoneyInput />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="discountPercent" label="Скидка, %">
              <InputNumber min={0} max={100} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="isActive" label="Активен" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>
        {discountedPreview && (
          <Typography.Paragraph type="secondary">
            Цена со скидкой: <Typography.Text strong>{discountedPreview}</Typography.Text>
          </Typography.Paragraph>
        )}

        {!features.gaps.adminProductList && (
          <Typography.Paragraph type="warning">
            Пока админский список товаров не реализован на бэкенде, выключенный переключатель
            «Активен» скроет товар из этой таблицы без возможности вернуть его через список.
          </Typography.Paragraph>
        )}

        <Divider />
        <Flex justify="flex-end" gap={12}>
          <Button onClick={() => navigate('/products')} disabled={submitting}>
            {readOnly ? 'К списку' : 'Отмена'}
          </Button>
          {!readOnly && (
            <Button type="primary" htmlType="submit" loading={submitting}>
              {product ? 'Сохранить' : 'Создать товар'}
            </Button>
          )}
        </Flex>
      </Form>
    </Card>
  );
}
