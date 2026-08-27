import { PlusOutlined } from '@ant-design/icons';
import {
  App as AntdApp,
  Button,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import type { NamePath } from 'antd/es/form/interface';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';

import type { CreateSkuRequest, Product, ProductSku } from '@entities/product';
import {
  useCreateSku,
  useDeactivateSku,
  useUpdateSku,
} from '@entities/product';
import { parseApiError } from '@shared/api';
import { formatMoney } from '@shared/lib';
import { MoneyInput } from '@shared/ui';

interface SkuManagerProps {
  product: Product;
}

interface SkuFormValues {
  name: string;
  article: string;
  priceCents?: number | null;
  discountPercent?: number | null;
  stockQty: number;
}

/** Локальное значение ячейки, синхронизируется с данными после рефетча */
function useDraft<T>(value: T) {
  const [draft, setDraft] = useState<T>(value);
  useEffect(() => setDraft(value), [value]);
  return [draft, setDraft] as const;
}

export function SkuManager({ product }: SkuManagerProps) {
  const { message, modal } = AntdApp.useApp();

  const createSku = useCreateSku(product.id);
  const updateSku = useUpdateSku(product.id);
  const deactivateSku = useDeactivateSku(product.id);

  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<SkuFormValues>();

  const skus = [...product.skus].sort((a, b) => a.article.localeCompare(b.article));

  const handleError = (error: unknown, formInstance?: FormInstance<SkuFormValues>) => {
    const appError = parseApiError(error);
    if (appError.kind === 'api' && formInstance) {
      const entries = Object.entries(appError.fieldErrors);
      if (entries.length > 0) {
        formInstance.setFields(
          entries.map(([name, errors]) => ({ name: name as NamePath<SkuFormValues>, errors })),
        );
        return;
      }
    }
    // Глобальный тост показан кэшем мутаций
  };

  const openCreate = () => {
    form.resetFields();
    setCreateOpen(true);
  };

  const onCreateFinish = async (values: SkuFormValues) => {
    const payload: CreateSkuRequest = {
      name: values.name.trim(),
      article: values.article.trim(),
      priceCents: values.priceCents ?? null,
      ...(values.discountPercent != null && values.discountPercent > 0
        ? { discountPercent: values.discountPercent }
        : {}),
      stockQty: values.stockQty,
    };
    try {
      await createSku.mutateAsync(payload);
      message.success('Вариант добавлен');
      setCreateOpen(false);
    } catch (error) {
      handleError(error, form);
    }
  };

  const patchSku = async (skuId: string, patch: Parameters<typeof updateSku.mutateAsync>[0]['patch']) => {
    try {
      await updateSku.mutateAsync({ skuId, patch });
    } catch {
      // тост показан глобально; строка обновится после отката/рефетча
    }
  };

  const confirmDeactivate = (record: ProductSku) => {
    modal.confirm({
      title: 'Деактивировать вариант?',
      content: `«${record.name}» (${record.article}) исчезнет из продажи. Активировать снова можно переключателем.`,
      okText: 'Деактивировать',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await deactivateSku.mutateAsync(record.id);
          message.success('Вариант деактивирован');
        } catch {
          // тост показан глобально
        }
      },
    });
  };

  const columns: ColumnsType<ProductSku> = [
    {
      title: 'Название',
      dataIndex: 'name',
      ellipsis: true,
      render: (_, record) => (
        <Flex vertical>
          <Typography.Text>{record.name}</Typography.Text>
          {!record.isActive && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              деактивирован
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    { title: 'Артикул', dataIndex: 'article', width: 140 },
    {
      title: 'Цена',
      key: 'price',
      width: 160,
      render: (_, record) => <InlinePriceCell sku={record} onSave={(v) => patchSku(record.id, { priceCents: v })} />,
    },
    {
      title: 'Скидка, %',
      key: 'discount',
      width: 110,
      render: (_, record) => (
        <InlineNumberCell
          value={record.discountPercent ?? undefined}
          min={0}
          max={100}
          onSave={(v) => patchSku(record.id, { discountPercent: v ?? 0 })}
        />
      ),
    },
    {
      title: 'Цена со скидкой',
      key: 'discounted',
      width: 140,
      render: (_, record) =>
        record.priceWithDiscountCents == null ? (
          <Typography.Text type="secondary">по товару</Typography.Text>
        ) : (
          formatMoney(record.priceWithDiscountCents)
        ),
    },
    {
      title: 'Остаток',
      key: 'stock',
      width: 120,
      render: (_, record) => (
        <InlineNumberCell
          value={record.stockQty}
          min={0}
          precision={0}
          onSave={(v) => patchSku(record.id, { stockQty: v ?? 0 })}
        />
      ),
    },
    {
      title: 'Активен',
      key: 'active',
      width: 100,
      render: (_, record) => (
        <Switch
          size="small"
          checked={record.isActive}
          loading={
            updateSku.isPending &&
            updateSku.variables?.skuId === record.id &&
            updateSku.variables?.patch?.isActive != null
          }
          onChange={(checked) => void patchSku(record.id, { isActive: checked })}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      align: 'right',
      render: (_, record) =>
        record.isActive ? (
          <Button
            size="small"
            danger
            loading={deactivateSku.isPending && deactivateSku.variables === record.id}
            onClick={() => confirmDeactivate(record)}
          >
            Деактивировать
          </Button>
        ) : null,
    },
  ];

  return (
    <Card
      title="Варианты (SKU)"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить вариант
        </Button>
      }
    >
      <Table<ProductSku>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={skus}
        pagination={false}
        locale={{ emptyText: 'У товара пока нет вариантов' }}
      />
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 12 }}>
        Если вариант один — он считается базовым. Выбор варианта на витрине появится
        автоматически, когда активных вариантов больше одного.
      </Typography.Paragraph>

      <Modal
        title="Новый вариант"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createSku.isPending}
        okText="Добавить"
        cancelText="Отмена"
        destroyOnClose
      >
        <Form<SkuFormValues> form={form} layout="vertical" onFinish={onCreateFinish}>
          <Form.Item
            name="name"
            label="Название"
            rules={[
              { required: true, message: 'Введите название' },
              { max: 200, message: 'Максимум 200 символов' },
            ]}
          >
            <Input placeholder="На 6 персон" />
          </Form.Item>
          <Form.Item
            name="article"
            label="Артикул"
            rules={[
              { required: true, message: 'Введите артикул' },
              { max: 64, message: 'Максимум 64 символа' },
            ]}
          >
            <Input placeholder="CS-1001-6" />
          </Form.Item>
          <Form.Item
            name="priceCents"
            label="Цена"
            extra="Пусто — используется цена товара"
          >
            <MoneyInput />
          </Form.Item>
          <Space size={16} align="start">
            <Form.Item
              name="discountPercent"
              label="Скидка, %"
              style={{ minWidth: 140 }}
            >
              <InputNumber min={0} max={100} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="stockQty"
              label="Остаток"
              rules={[{ required: true, message: 'Введите остаток' }]}
              style={{ minWidth: 140 }}
            >
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}

function InlinePriceCell({
  sku,
  onSave,
}: {
  sku: ProductSku;
  onSave: (value: number | null) => Promise<void>;
}) {
  const initial = sku.priceCents ?? null;
  const [draft, setDraft] = useDraft<number | null>(initial);

  const commit = async () => {
    if (draft === initial) return;
    await onSave(draft);
  };

  return (
    <MoneyInput
      size="small"
      style={{ width: 140 }}
      value={draft}
      onChange={setDraft}
      onBlur={() => void commit()}
      onPressEnter={() => void commit()}
    />
  );
}

function InlineNumberCell({
  value,
  min,
  max,
  precision,
  onSave,
}: {
  value?: number;
  min?: number;
  max?: number;
  precision?: number;
  onSave: (value: number | undefined) => Promise<void>;
}) {
  const initial = value;
  const [draft, setDraft] = useDraft<number | undefined>(initial);

  const commit = async () => {
    if (draft === initial) return;
    await onSave(draft);
  };

  return (
    <InputNumber
      size="small"
      min={min}
      max={max}
      precision={precision}
      style={{ width: 90 }}
      value={draft}
      onChange={(next) => setDraft(next ?? undefined)}
      onBlur={() => void commit()}
      onPressEnter={() => void commit()}
    />
  );
}
