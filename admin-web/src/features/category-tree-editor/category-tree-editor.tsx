import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Flex,
  Row,
  Space,
  Spin,
  Tag,
  Tooltip,
  Tree,
  Typography,
} from 'antd';
import type { TreeProps } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useMemo, useState } from 'react';

import { CategoryModal } from './category-modal';
import type { CategoryModalState } from './category-modal';
import { containsNode, getNode, getParentId } from './tree-utils';

import type {
  AdminCategoryNode,
  UpdateCategoryRequest,
} from '@entities/category';
import {
  useAdminCategoriesQuery,
  useDeleteCategory,
  useUpdateCategory,
} from '@entities/category';
import { formatDateTime } from '@shared/lib';


function buildTreeData(nodes: AdminCategoryNode[]): DataNode[] {
  return nodes.map((node) => ({
    key: node.id,
    title: <TreeTitle node={node} />,
    children: node.children.length > 0 ? buildTreeData(node.children) : undefined,
  }));
}

function TreeTitle({ node }: { node: AdminCategoryNode }) {
  return (
    <Space size={6}>
      <Typography.Text delete={node.deletedAt != null}>{node.name}</Typography.Text>
      {node.deletedAt != null ? (
        <Tag color="red">Удалена</Tag>
      ) : !node.isActive ? (
        <Tag color="orange">Скрыта</Tag>
      ) : null}
      {node.activeProductCount > 0 && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          товаров: {node.activeProductCount}
        </Typography.Text>
      )}
    </Space>
  );
}

interface ReorderPatch {
  id: string;
  payload: UpdateCategoryRequest;
}

export function CategoryTreeEditor() {
  const { message } = AntdApp.useApp();

  const treeQuery = useAdminCategoriesQuery();
  const updateCategory = useUpdateCategory();

  const tree = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<CategoryModalState | null>(null);

  const selectedNode = selectedId ? getNode(tree, selectedId) : null;

  const treeData = useMemo(() => buildTreeData(tree), [tree]);

  const openCreateRoot = () => setModalState({ mode: 'create' });

  const onDrop: TreeProps['onDrop'] = async (info) => {
    const dragId = String(info.dragNodesKeys[0]);
    const dropId = String(info.node.key);
    if (dragId === dropId) return;

    const dragged = getNode(tree, dragId);
    const dropTarget = getNode(tree, dropId);
    if (!dragged || !dropTarget) return;

    const dropPosParts = info.node.pos.split('-');
    const dropNodeIndex = Number(dropPosParts[dropPosParts.length - 1]);
    // -1 — перед узлом, 0 — внутрь, 1 — после
    const position = info.dropToGap ? info.dropPosition - dropNodeIndex : 0;

    if (position === 0 && containsNode(dragged, dropId)) {
      message.error('Нельзя перенести категорию внутрь её собственного поддерева');
      return;
    }

    if (position === 0) {
      // Перенос внутрь: последним ребёнком цели
      const nextSort =
        dropTarget.children.reduce((max, child) => Math.max(max, child.sortOrder), -1) + 1;
      try {
        await updateCategory.mutateAsync({
          id: dragId,
          payload: { parentId: dropId, sortOrder: nextSort },
        });
        message.success(`«${dragged.name}» перенесена в «${dropTarget.name}»`);
      } catch {
        // тост показан глобально
      }
      return;
    }

    // Соседство с целью: переупорядочивание среди детей родителя цели
    const newParentId = getParentId(tree, dropId);
    if (!newParentId) {
      message.warning('Перенос в корень недоступен: API не поддерживает сброс родителя');
      return;
    }

    const newParent = getNode(tree, newParentId);
    if (!newParent) return;

    const siblings = newParent.children.filter((item) => item.id !== dragId);
    const targetIndex = siblings.findIndex((item) => item.id === dropId);
    const insertIndex = position === -1 ? targetIndex : targetIndex + 1;

    const ordered: AdminCategoryNode[] = [
      ...siblings.slice(0, insertIndex),
      dragged,
      ...siblings.slice(insertIndex),
    ];

    const draggedOldParentId = getParentId(tree, dragId);
    const patches: ReorderPatch[] = [];
    ordered.forEach((item, index) => {
      const needsReparent = item.id === dragId && draggedOldParentId !== newParentId;
      if (needsReparent || item.sortOrder !== index) {
        patches.push({
          id: item.id,
          payload: {
            sortOrder: index,
            ...(needsReparent ? { parentId: newParentId } : {}),
          },
        });
      }
    });

    if (patches.length === 0) return;

    const results = await Promise.allSettled(
      patches.map((patch) => updateCategory.mutateAsync(patch)),
    );
    const failed = results.filter((result) => result.status === 'rejected').length;
    if (failed > 0) {
      message.warning('Порядок сохранён частично — обновите дерево и повторите при необходимости');
    } else {
      message.success('Порядок сохранён');
    }
  };

  if (treeQuery.isPending) {
    return (
      <Card>
        <Flex justify="center" style={{ paddingBlock: 48 }}>
          <Spin />
        </Flex>
      </Card>
    );
  }

  return (
    <>
      <Row gutter={16}>
        <Col xs={24} lg={10}>
          <Card
            title="Дерево категорий"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateRoot}>
                Создать категорию
              </Button>
            }
          >
            <Tree
              key={tree.length > 0 ? 'ready' : 'loading'}
              blockNode
              defaultExpandAll
              draggable={{ icon: false }}
              selectable
              selectedKeys={selectedId ? [selectedId] : []}
              onSelect={(keys) => setSelectedId(keys[0] != null ? String(keys[0]) : null)}
              onDrop={(info) => void onDrop(info)}
              treeData={treeData}
            />
            {treeData.length === 0 && <Empty description="Категорий пока нет" />}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          {selectedNode ? (
            <SelectedPanel
              node={selectedNode}
              onCreateChild={() => setModalState({ mode: 'create', node: selectedNode })}
              onEdit={() => setModalState({ mode: 'edit', node: selectedNode })}
            />
          ) : (
            <Card>
              <Empty description="Выберите категорию в дереве" />
            </Card>
          )}
        </Col>
      </Row>

      {modalState && (
        <CategoryModal state={modalState} tree={tree} onClose={() => setModalState(null)} />
      )}
    </>
  );
}

function SelectedPanel({
  node,
  onCreateChild,
  onEdit,
}: {
  node: AdminCategoryNode;
  onCreateChild: () => void;
  onEdit: () => void;
}) {
  const deleteCategory = useDeleteCategory();
  const { message, modal } = AntdApp.useApp();

  const isDeleted = node.deletedAt != null;

  const handleDelete = () => {
    modal.confirm({
      title: 'Удалить категорию?',
      content: `«${node.name}» будет скрыта из каталога. Если у категории есть неудалённые товары или подкатегории, сервер отклонит операцию.`,
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        await deleteCategory.mutateAsync(node.id);
        message.success('Категория удалена');
      },
    });
  };

  const canHaveChildren = !isDeleted && node.isActive;

  return (
    <Card
      title={node.name}
      extra={
        <Space>
          <Tooltip title={!canHaveChildren ? 'Доступно только для активной категории' : undefined}>
            <Button disabled={!canHaveChildren} onClick={onCreateChild}>
              Подкатегория
            </Button>
          </Tooltip>
          <Tooltip title={isDeleted ? 'Категория удалена' : undefined}>
            <Button type="primary" disabled={isDeleted} onClick={onEdit}>
              Редактировать
            </Button>
          </Tooltip>
          {!isDeleted && (
            <Button danger loading={deleteCategory.isPending} onClick={handleDelete}>
              Удалить
            </Button>
          )}
        </Space>
      }
    >
      {isDeleted && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Категория удалена ${formatDateTime(node.deletedAt!)}`}
          description="Восстановление через UI не предусмотрено контрактом API."
        />
      )}
      {!node.isActive && !isDeleted && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Категория скрыта из публичного каталога"
          description="Включите переключатель «Активна» в редактировании, чтобы вернуть её на витрину."
        />
      )}
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Slug">
          <Typography.Text code>{node.slug}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Порядок сортировки">{node.sortOrder}</Descriptions.Item>
        <Descriptions.Item label="Активных товаров">{node.activeProductCount}</Descriptions.Item>
        <Descriptions.Item label="Подкатегорий">{node.children.length}</Descriptions.Item>
        <Descriptions.Item label="Статус">
          {isDeleted ? (
            <Tag color="red">Удалена</Tag>
          ) : node.isActive ? (
            <Tag color="green">Активна</Tag>
          ) : (
            <Tag color="orange">Скрыта</Tag>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
