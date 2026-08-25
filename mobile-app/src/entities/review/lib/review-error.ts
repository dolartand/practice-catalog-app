import type { AppError } from '@shared/api';

export type ReviewErrorKind = 'exists' | 'forbidden' | 'gone' | 'generic';

function mapReviewError(error: unknown): ReviewErrorKind {
  const appError = error as AppError | undefined;
  if (appError && appError.kind === 'api') {
    if (appError.status === 409) return 'exists';
    if (appError.status === 403) return 'forbidden';
    if (appError.status === 404) return 'gone';
  }
  return 'generic';
}

/**
 * Готовый i18n-ключ тоста для ошибок создания/редактирования.
 * Случай 'gone' (отзыв исчез на сервере) фичи обрабатывают сами —
 * это отдельный сценарий «забыть локальную запись», а не просто тост.
 */
export function reviewErrorToastKey(error: unknown): string {
  switch (mapReviewError(error)) {
    case 'exists':
      return 'review.error_exists';
    case 'forbidden':
      return 'review.error_forbidden';
    default:
      return 'errors.unknown.title';
  }
}

/** 404 — отзыв исчез на сервере (админ/другое устройство) */
export function isReviewGone(error: unknown): boolean {
  return mapReviewError(error) === 'gone';
}

export { mapReviewError };
