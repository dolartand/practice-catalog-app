import { App as AntdApp } from 'antd';
import { useEffect } from 'react';

import { bindFeedback } from '@shared/lib';

/** Монтируется внутри <App>: привязывает message/modal/notification к мосту для кода вне React. */
export function FeedbackBridge() {
  const { message, modal, notification } = AntdApp.useApp();

  useEffect(() => {
    bindFeedback({ message, modal, notification });
  }, [message, modal, notification]);

  return null;
}
