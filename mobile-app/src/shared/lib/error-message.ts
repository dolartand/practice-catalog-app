import { useTranslation } from 'react-i18next';

import type { AppError } from '@shared/api/problem-details';

export function useErrorMessage(error: AppError | null): { title: string; detail: string } | null {
  const { t } = useTranslation();

  if (!error) return null;

  if (error.kind === 'api') {
    return { title: error.title, detail: error.detail };
  }

  return { title: t(error.titleKey), detail: t(error.detailKey) };
}