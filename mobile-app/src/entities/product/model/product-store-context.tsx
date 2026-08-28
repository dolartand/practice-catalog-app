import { createContext, useContext, type PropsWithChildren } from 'react';

import { ProductStore, productStore, useProductStoreSelector } from './product.store';

const ProductStoreContext = createContext<ProductStore | null>(null);

export function ProductStoresProvider({ children }: PropsWithChildren) {
  return <ProductStoreContext.Provider value={productStore}>{children}</ProductStoreContext.Provider>;
}

export function useProductStore(): ProductStore {
  const ctx = useContext(ProductStoreContext);
  if (!ctx) throw new Error('useProductStore must be used within ProductStoresProvider');
  return ctx;
}

export { useProductStoreSelector };