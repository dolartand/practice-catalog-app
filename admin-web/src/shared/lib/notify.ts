import type { MessageInstance } from 'antd/es/message/interface';
import type { HookAPI as ModalHookAPI } from 'antd/es/modal/useModal';
import type { NotificationInstance } from 'antd/es/notification/interface';

interface FeedbackInstances {
  message: MessageInstance;
  modal: Omit<ModalHookAPI, 'warn'>;
  notification: NotificationInstance;
}

let instances: FeedbackInstances | null = null;

// Мост между AntD App-контекстом и кодом вне React (интерцепторы axios, query-cache).
export function bindFeedback(next: FeedbackInstances) {
  instances = next;
}

export function getFeedback(): FeedbackInstances {
  if (!instances) {
    throw new Error('Feedback не привязан: FeedbackBridge должен быть смонтирован');
  }
  return instances;
}
