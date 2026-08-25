import { reaction } from 'mobx';

import { favoriteStore } from '@entities/favorite';
import { sessionStore } from '@entities/session';

reaction(
  () => sessionStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated && sessionStore.user) {
      favoriteStore.init(sessionStore.user.id);
    } else {
      favoriteStore.reset();
    }
  },
  { fireImmediately: true },
);
