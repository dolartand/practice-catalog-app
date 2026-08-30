import { useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useFavoriteStore } from '../stores/favoriteStore';

export function useFavoritesSessionSync() {
  const isAuthenticated = useSessionStore((s) => s.status === 'authenticated');
  const user = useSessionStore((s) => s.user);
  const init = useFavoriteStore((s) => s.init);
  const reset = useFavoriteStore((s) => s.reset);

  useEffect(() => {
    if (isAuthenticated && user) {
      init(user.id);
    } else {
      reset();
    }
  }, [isAuthenticated, user, init, reset]);
}