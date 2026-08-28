import { create } from 'zustand';
import { categoryApi } from '../entities/category/api/category.api';
import type { CategoryNode } from '../entities/category/model/types';

export type { CategoryNode };

interface FlatEntry {
  node: CategoryNode;
  path: CategoryNode[];
}

interface CategoryState {
  tree: CategoryNode[];
  isLoading: boolean;
  error: string | null;
  flatIndex: Map<string, FlatEntry>;

  fetchTree: () => Promise<void>;
  getById: (id: string) => CategoryNode | undefined;
  getPath: (id: string) => CategoryNode[];
  getChildren: (id: string | null) => CategoryNode[];
}

function rebuildFlatIndex(tree: CategoryNode[]): Map<string, FlatEntry> {
  const flatIndex = new Map<string, FlatEntry>();
  const walk = (nodes: CategoryNode[], parentPath: CategoryNode[]) => {
    for (const node of nodes) {
      const path = [...parentPath, node];
      flatIndex.set(node.id, { node, path });
      walk(node.children, path);
    }
  };
  walk(tree, []);
  return flatIndex;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  tree: [],
  isLoading: false,
  error: null,
  flatIndex: new Map(),

  fetchTree: async () => {
    set({ isLoading: true, error: null });
    try {
      const tree = await categoryApi.getTree();
      set({ tree, isLoading: false, flatIndex: rebuildFlatIndex(tree) });
    } catch {
      set({ error: 'categories_load_failed', isLoading: false });
    }
  },

  getById: (id: string) => get().flatIndex.get(id)?.node,

  getPath: (id: string) => get().flatIndex.get(id)?.path ?? [],

  getChildren: (id: string | null) => {
    if (id === null) return get().tree;
    return get().flatIndex.get(id)?.node.children ?? [];
  },
}));