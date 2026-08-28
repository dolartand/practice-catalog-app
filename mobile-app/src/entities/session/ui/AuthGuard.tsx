import { Redirect } from 'expo-router';
import { type PropsWithChildren } from 'react';
import { useSessionStore } from '@stores/sessionStore';

import { ROUTES } from '@shared/lib';

export const AuthGuard = ({ children }: PropsWithChildren) => {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Redirect href={ROUTES.auth.login} />;
  }
  return children;
};
