import {
  App as AntdApp,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Switch,
  TreeSelect,
  Typography,
} from 'antd';
import type { TreeSelectProps } from 'antd';
import type { NamePath } from 'antd/es/form/interface';
import { useState } from 'react';

import { excludeSubtree, getParentId, onlyActiveBranches, toOptions } from './tree-utils';

import type {
  AdminCategoryNode,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@entities/category';
import { useCreateCategory, useUpdateCategory } from '@entities/category';
import { parseApiError } from '@shared/api';
import { showErrorToast } from '@shared/lib';


export interface CategoryModalState {
  mode: 'create' | 'edit';
  /** Для create — родитель новой категории; для edit — сам узел */
  node?: AdminCategoryNode;
}

interface CategoryModalProps {
  state: CategoryModalState;
  tree: AdminCategoryNode[];
  onClose: () => void;
}

interface CategoryFormValues {
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number | null;
  isActive: boolean;
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;

/** Пустая строка → null (создание хранит null) */
const textOrNull = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** При редактировании пустая строка сохраняется как '' — иначе бэкенд оставит старое значение */
const textOrEmpty = (value?: string): string => value?.trim() ?? '';

export function CategoryModal({ state, tree, onClose }: CategoryModalProps) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<CategoryFormValues>();

  const isEdit = state.mode === 'edit';
  const node = isEdit ? state.node : undefined;

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  // destroyOnClose пересоздаёт форму на каждое открытие — достаточно initialValues
  const [initialValues] = useState<CategoryFormValues>(() => ({
    name: node?.name ?? '',
    slug: node?.slug ?? '',
    parentId:
      (isEdit && node ? getParentId(tree, node.id) : state.node?.id) ?? undefined,
    description: undefined,
    imageUrl: node?.imageUrl ?? undefined,
    sortOrder: node?.sortOrder ?? 0,
    isActive: node?.isActive ?? true,
  }));

  // Родитель для создания — только активные ветки (ограничение бэкенда);
  // для редактирования — всё дерево без собственной поддерева.
  const parentTreeData: TreeSelectProps['treeData'] = isEdit
    ? toOptions(node ? excludeSubtree(tree, node.id) : tree)
    : toOptions(onlyActiveBranches(tree));

  const handleError = (error: unknown) => {
    const appError = parseApiError(error);
    if (appError.kind !== 'api') {
      showErrorToast(error, 'Не удалось сохранить категорию');
      return;
    }
    const entries = Object.entries(appError.fieldErrors);
    if (entries.length > 0) {
      form.setFields(
        entries.map(([name, errors]) => ({ name: name as NamePath<CategoryFormValues>, errors })),
      );
      return;
    }
    // 409 (дубликат slug и т.п.) — detail от сервера
    message.error(appError.detail || appError.title);
  };

  const onFinish = async (values: CategoryFormValues) => {
    try {
      if (isEdit && node) {
        // description не отправляем: дерево его не возвращает, а null = «не менять»
        const payload: UpdateCategoryRequest = {
          name: values.name.trim(),
          slug: values.slug.trim(),
          parentId: values.parentId ?? null,
          imageUrl: textOrEmpty(values.imageUrl),
          sortOrder: values.sortOrder ?? null,
          isActive: values.isActive,
        };
        await updateMutation.mutateAsync({ id: node.id, payload });
        message.success('Категория сохранена');
      } else {
        const payload: CreateCategoryRequest = {
          name: values.name.trim(),
          slug: values.slug.trim(),
          parentId: values.parentId ?? null,
          description: textOrNull(values.description),
          imageUrl: textOrNull(values.imageUrl),
          sortOrder: values.sortOrder ?? 0,
        };
        await createMutation.mutateAsync(payload);
        message.success('Категория создана');
      }
      onClose();
    } catch (error) {
      handleError(error);
    }
  };

  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={isEdit ? `Редактировать «${node?.name}»` : 'Новая категория'}
      open
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      okText={isEdit ? 'Сохранить' : 'Создать'}
      cancelText="Отмена"
      destroyOnClose
    >
      <Form<CategoryFormValues>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={initialValues}
      >
        <Flex gap={16} align="flex-start">
          <Form.Item
            name="name"
            label="Название"
            rules={[
              { required: true, message: 'Введите название' },
              { max: 200, message: 'Максимум 200 символов' },
            ]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Чайные сервизы" />
          </Form.Item>
          <Form.Item name="isActive" label="Активна" valuePropName="checked" hidden={!isEdit}>
            <Switch />
          </Form.Item>
        </Flex>
        <Form.Item
          name="slug"
          label="Slug"
          rules={[
            { required: true, message: 'Введите slug' },
            { pattern: SLUG_PATTERN, message: 'Только a-z, 0-9 и дефис' },
          ]}
          extra="Уникален среди категорий; используется в адресах витрины"
        >
          <Input placeholder="chainye-servizy" />
        </Form.Item>
        <Form.Item
          name="parentId"
          label="Родительская категория"
          extra={
            isEdit ? (
              <Typography.Text type="warning">
                Перенос в корень недоступен: API не поддерживает сброс родителя
              </Typography.Text>
            ) : (
              'Не выбрана — категория будет корневой'
            )
          }
        >
          <TreeSelect
            allowClear={!isEdit}
            treeDefaultExpandAll
            treeData={parentTreeData}
            treeNodeFilterProp="title"
            showSearch
            placeholder="Корень"
          />
        </Form.Item>
        {!isEdit && (
          <Form.Item name="description" label="Описание">
            <Input.TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>
        )}
        <Form.Item
          name="imageUrl"
          label="URL изображения"
          rules={[{ type: 'url', message: 'Введите корректный URL' }]}
        >
          <Input placeholder="https://…" />
        </Form.Item>
        <Form.Item name="sortOrder" label="Порядок сортировки">
          <InputNumber min={0} precision={0} style={{ width: 160 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
