import { Redirect } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { type PropsWithChildren } from 'react';

import { sessionStore } from '../model/session.store';

import { ROUTES } from '@shared/lib';

export const AuthGuard = observer(({ children }: PropsWithChildren) => {
  if (!sessionStore.isAuthenticated) {
    return <Redirect href={ROUTES.auth.login} />;
  }
  return children;
});
