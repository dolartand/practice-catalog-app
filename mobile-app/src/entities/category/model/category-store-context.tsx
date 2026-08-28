import { createContext, useContext, type PropsWithChildren } from 'react';

import { CategoryStore, categoryStore, useCategoryStoreSelector } from './category.store';

const CategoryStoreContext = createContext<CategoryStore | null>(null);

export function CategoryStoreProvider({ children }: PropsWithChildren) {
  return <CategoryStoreContext.Provider value={categoryStore}>{children}</CategoryStoreContext.Provider>;
}

export function useCategoryStore(): CategoryStore {
  const ctx = useContext(CategoryStoreContext);
  if (!ctx) throw new Error('useCategoryStore must be used within CategoryStoreProvider');
  return ctx;
}

export { useCategoryStoreSelector };