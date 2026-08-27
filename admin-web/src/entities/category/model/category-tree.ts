import type { TreeSelectProps } from 'antd';

import type { CategoryNode } from './types';

type CategoryOption = NonNullable<TreeSelectProps['treeData']>[number];

/** CategoryNode[] → treeData для AntD TreeSelect/Select (value = id) */
export function toCategoryTreeData(nodes: CategoryNode[]): TreeSelectProps['treeData'] {
  const map = (list: CategoryNode[]): CategoryOption[] =>
    list.map((node) => ({
      value: node.id,
      title: node.name,
      children: node.children.length > 0 ? map(node.children) : undefined,
    }));

  return map(nodes);
}
