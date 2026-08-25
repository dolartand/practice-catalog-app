import { createContext, useContext, useState, type PropsWithChildren } from 'react';

import { CategoryStore } from './category.store';

const CategoryStoreContext = createContext<CategoryStore | null>(null);

export function CategoryStoreProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => new CategoryStore());
  return <CategoryStoreContext.Provider value={store}>{children}</CategoryStoreContext.Provider>;
}

export function useCategoryStore(): CategoryStore {
  const ctx = useContext(CategoryStoreContext);
  if (!ctx) throw new Error('useCategoryStore must be used within CategoryStoreProvider');
  return ctx;
}