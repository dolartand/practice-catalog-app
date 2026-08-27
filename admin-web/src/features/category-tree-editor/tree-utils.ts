import type { TreeSelectProps } from 'antd';

import type { AdminCategoryNode } from '@entities/category';

/** Дерево не содержит parentId — родитель вычисляется обходом */
export function findNode(
  nodes: AdminCategoryNode[],
  id: string,
  parent: AdminCategoryNode | null = null,
): { node: AdminCategoryNode; parent: AdminCategoryNode | null } | null {
  for (const node of nodes) {
    if (node.id === id) return { node, parent };
    const found = findNode(node.children, id, node);
    if (found) return found;
  }
  return null;
}

export function getNode(nodes: AdminCategoryNode[], id: string): AdminCategoryNode | null {
  return findNode(nodes, id)?.node ?? null;
}

export function getParentId(nodes: AdminCategoryNode[], id: string): string | null {
  return findNode(nodes, id)?.parent?.id ?? null;
}

/** Держит ли ветка узла с id собственную поддерево, содержащую targetId */
export function containsNode(node: AdminCategoryNode, id: string): boolean {
  if (node.id === id) return true;
  return node.children.some((child) => containsNode(child, id));
}

/** Копия дерева без поддерева excludedId (выбор родителя без циклов) */
export function excludeSubtree(
  nodes: AdminCategoryNode[],
  excludedId: string,
): AdminCategoryNode[] {
  return nodes
    .filter((node) => node.id !== excludedId)
    .map((node) => ({ ...node, children: excludeSubtree(node.children, excludedId) }));
}

/** Только активные неудалённые ветки (ограничение бэкенда на родителя при создании) */
export function onlyActiveBranches(nodes: AdminCategoryNode[]): AdminCategoryNode[] {
  return nodes
    .filter((node) => node.isActive && !node.deletedAt)
    .map((node) => ({ ...node, children: onlyActiveBranches(node.children) }));
}

export function toOptions(nodes: AdminCategoryNode[]): TreeSelectProps['treeData'] {
  return nodes.map((node) => ({
    value: node.id,
    title: node.name,
    children: node.children.length > 0 ? toOptions(node.children) : undefined,
  }));
}
