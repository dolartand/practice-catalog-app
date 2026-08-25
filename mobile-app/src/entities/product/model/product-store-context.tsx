import { createContext, useContext, useState, type PropsWithChildren } from 'react';

import { ProductStore } from './product.store';

const ProductStoreContext = createContext<ProductStore | null>(null);

export function ProductStoresProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => new ProductStore());
  return <ProductStoreContext.Provider value={store}>{children}</ProductStoreContext.Provider>;
}

export function useProductStore(): ProductStore {
  const ctx = useContext(ProductStoreContext);
  if (!ctx) throw new Error('useProductStore must be used within ProductStoresProvider');
  return ctx;
}