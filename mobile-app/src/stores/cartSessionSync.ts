import { useEffect } from 'react';
import { useSessionStore } from '@stores/sessionStore';
import { useCartStore } from '@stores/cartStore';

export function useCartSessionSync() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const fetch = useCartStore((s) => s.fetch);
  const reset = useCartStore((s) => s.reset);

  useEffect(() => {
    if (isAuthenticated) {
      fetch();
    } else {
      reset();
    }
  }, [isAuthenticated, fetch, reset]);
}