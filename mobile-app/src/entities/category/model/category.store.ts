import { makeAutoObservable, runInAction, observe } from 'mobx';
import { useSyncExternalStore } from 'react';

import { categoryApi } from '../api/category.api';

import type { CategoryNode } from './types';

interface FlatEntry {
  node: CategoryNode;
  path: CategoryNode[];
}

export class CategoryStore {
  tree: CategoryNode[] = [];
  isLoading = false;
  error: string | null = null;

  private flatIndex = new Map<string, FlatEntry>();

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async fetchTree() {
    this.isLoading = true;
    this.error = null;

    try {
      const tree = await categoryApi.getTree();
      runInAction(() => {
        this.tree = tree;
        this.rebuildFlatIndex(tree);
      });
    } catch {
      runInAction(() => {
        this.error = 'categories_load_failed';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  private rebuildFlatIndex(tree: CategoryNode[]) {
    this.flatIndex.clear();
    const walk = (nodes: CategoryNode[], parentPath: CategoryNode[]) => {
      for (const node of nodes) {
        const path = [...parentPath, node];
        this.flatIndex.set(node.id, { node, path });
        walk(node.children, path);
      }
    };
    walk(tree, []);
  }

  getById(id: string): CategoryNode | undefined {
    return this.flatIndex.get(id)?.node;
  }

  getPath(id: string): CategoryNode[] {
    return this.flatIndex.get(id)?.path ?? [];
  }

  getChildren(id: string | null): CategoryNode[] {
    if (id === null) return this.tree;
    return this.flatIndex.get(id)?.node.children ?? [];
  }
}

export const categoryStore = new CategoryStore();

export function useCategoryStoreSelector<T>(selector: (store: CategoryStore) => T): T {
  return useSyncExternalStore(
    (callback) => observe(categoryStore, callback),
    () => selector(categoryStore),
    () => selector(categoryStore)
  );
}