import { showToast } from './toast';

import { parseApiError } from '@shared/api/problem-details';
import i18n from '@shared/i18n/config';


// Блок 11: единая точка, где Problem Details превращаются в понятный тост.
// Сырые английские title/detail бэкенда в UI не показываем.
export function showErrorToast(error: unknown) {
  const appError = parseApiError(error);

  if (appError.kind === 'network') {
    showToast(i18n.t(appError.titleKey));
    return;
  }
  if (appError.kind !== 'api') {
    showToast(i18n.t(appError.titleKey));
    return;
  }

  const key = FRIENDLY_STATUS_KEY[appError.status] ?? 'errors.unknown.title';
  showToast(i18n.t(key));
}

const FRIENDLY_STATUS_KEY: Record<number, string> = {
  400: 'errors.http.bad_request',
  403: 'errors.http.forbidden',
  404: 'errors.http.not_found',
  409: 'errors.http.conflict',
  422: 'errors.http.validation',
};
