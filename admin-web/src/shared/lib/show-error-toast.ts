import { getFeedback } from './notify';

import { parseApiError } from '@shared/api';

/**
 * Единая точка показа ошибок API (Problem Details) вне форм.
 * Ошибки, мапящиеся в поля формы, помечаются meta.skipGlobalError
 * и обрабатываются мутацией самостоятельно.
 */
export function showErrorToast(error: unknown, fallbackTitle = 'Не удалось выполнить запрос') {
  const appError = parseApiError(error);

  // 401 обрабатывается refresh-flow сессии — здесь не дублируем.
  if (appError.kind === 'api' && appError.status === 401) {
    return;
  }

  const { message, notification } = getFeedback();

  switch (appError.kind) {
    case 'api': {
      if (appError.status === 403) {
        message.error('Недостаточно прав');
        return;
      }
      notification.error({
        message: appError.title || fallbackTitle,
        description: appError.detail || undefined,
      });
      return;
    }
    case 'network': {
      notification.error({ message: 'Нет соединения', description: 'Сервер недоступен.' });
      return;
    }
    default: {
      notification.error({
        message: fallbackTitle,
        description: 'Что-то пошло не так. Попробуйте ещё раз.',
      });
    }
  }
}
