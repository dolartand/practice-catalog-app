import { createContext, useContext, type PropsWithChildren } from 'react';

import { OrderStore, orderStore, useOrderStoreSelector } from './order.store';

const OrderStoreContext = createContext<OrderStore | null>(null);

export function OrderStoreProvider({ children }: PropsWithChildren) {
  return <OrderStoreContext.Provider value={orderStore}>{children}</OrderStoreContext.Provider>;
}

export function useOrderStore(): OrderStore {
  const ctx = useContext(OrderStoreContext);
  if (!ctx) throw new Error('useOrderStore must be used within OrderStoreProvider');
  return ctx;
}

export { useOrderStoreSelector };