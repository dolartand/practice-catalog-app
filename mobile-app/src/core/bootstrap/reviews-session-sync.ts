import { reaction } from 'mobx';

import { reviewStore } from '@entities/review';
import { sessionStore } from '@entities/session';

reaction(
  () => sessionStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated && sessionStore.user) {
      reviewStore.init(sessionStore.user.id);
    } else {
      reviewStore.reset();
    }
  },
  { fireImmediately: true },
);
