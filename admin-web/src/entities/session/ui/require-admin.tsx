import { Button, Result } from 'antd';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../model/auth-context';

import { FullPageSpinner } from '@shared/ui';

/** Guard защищённых маршрутов (docs/frontend/web/04-auth.md §5) */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, user, logout } = useAuth();
  const location = useLocation();

  if (status === 'restoring') {
    return <FullPageSpinner />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.role !== 'ADMIN') {
    return (
      <Result
        status="403"
        title="Нет доступа"
        subTitle="Интерфейс доступен только администраторам."
        extra={
          <Button type="primary" onClick={() => void logout()}>
            Выйти
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
