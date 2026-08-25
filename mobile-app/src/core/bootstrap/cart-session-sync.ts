import { reaction } from 'mobx';

import { cartStore } from '@entities/cart';
import { sessionStore } from '@entities/session';

reaction(
  () => sessionStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      cartStore.fetch();
    } else {
      cartStore.reset();
    }
  },
  { fireImmediately: true },
);