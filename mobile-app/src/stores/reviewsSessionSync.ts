import { useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useReviewStore } from '../stores/reviewStore';

export function useReviewsSessionSync() {
  const isAuthenticated = useSessionStore((s) => s.status === 'authenticated');
  const user = useSessionStore((s) => s.user);
  const init = useReviewStore((s) => s.init);
  const reset = useReviewStore((s) => s.reset);

  useEffect(() => {
    if (isAuthenticated && user) {
      init(user.id);
    } else {
      reset();
    }
  }, [isAuthenticated, user, init, reset]);
}