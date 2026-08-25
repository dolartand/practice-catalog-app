import { makeAutoObservable, runInAction } from 'mobx';

import { favoriteApi } from '../api/favorite.api';

import type { FavoriteProduct } from './types';

import { DEFAULT_PAGE_SIZE, FAVORITES_SYNC, hasNextPage, kvStorage, STORAGE_KEYS } from '@shared/lib';


const LIST_PAGE_SIZE = DEFAULT_PAGE_SIZE;

// Параметры полной синхронизации id. Бэкенд клампит size в [1..100],
// потолок страниц — защита от патологического случая (сотни позиций избранного)
const { SIZE: SYNC_SIZE, MAX_PAGES: MAX_SYNC_PAGES } = FAVORITES_SYNC;

function parseCachedIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

class FavoriteStore {
  items: FavoriteProduct[] = [];
  page = 0;
  total = 0;
  totalPages = 0;

  isLoading = false;
  isLoadingMore = false;
  error: string | null = null;

  // Тогглы «в полёте» — на это время кнопка слегка приглушается
  pendingIds = new Set<string>();

  private favoriteIds = new Set<string>();
  private cacheKey: string | null = null;
  private isSyncing = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get hasMore(): boolean {
    return hasNextPage({ page: this.page, totalPages: this.totalPages });
  }

  // Локальный счётчик для бейджа таба: мгновенно обновляется optimistic-тогглом,
  // выравнивается с сервером после fullSync/fetch
  get count(): number {
    return this.favoriteIds.size;
  }

  has(productId: string): boolean {
    return this.favoriteIds.has(productId);
  }

  isPending(productId: string): boolean {
    return this.pendingIds.has(productId);
  }

  /**
   * Гидрация при входе/восстановлении сессии (вызывается из core/bootstrap,
   * поэтому сессия сюда не импортируется — границы слоёв).
   * Сначала мгновенно поднимаем кэш id (сердечки верны без ожидания сети),
   * затем тихо синхронизируемся с сервером.
   */
  init(userId: string) {
    this.cacheKey = STORAGE_KEYS.favoritesIds(userId);
    runInAction(() => {
      this.favoriteIds = new Set(parseCachedIds(kvStorage.getString(this.cacheKey!)));
    });
    void this.fullSync();
  }

  async fetch() {
    this.isLoading = true;
    this.error = null;
    try {
      const result = await favoriteApi.getList({ page: 0, size: LIST_PAGE_SIZE });
      runInAction(() => {
        this.items = result.items;
        this.page = result.page;
        this.total = result.total;
        this.totalPages = result.totalPages;
        this.reconcile(result.items.map((item) => item.id));
      });
    } catch {
      runInAction(() => {
        this.error = 'favorites_load_failed';
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }

  async fetchMore() {
    if (!this.hasMore || this.isLoadingMore) return;

    this.isLoadingMore = true;
    try {
      const nextPage = this.page + 1;
      const result = await favoriteApi.getList({ page: nextPage, size: LIST_PAGE_SIZE });

      runInAction(() => {
        this.items = [...this.items, ...result.items];
        this.page = result.page;
        this.total = result.total;
        this.totalPages = result.totalPages;
        this.reconcile(result.items.map((item) => item.id));
      });
    } finally {
      runInAction(() => {
        this.isLoadingMore = false;
      });
    }
  }

  /**
   * Optimistic toggle: состояние меняется мгновенно, запрос уходит в фоне,
   * при ошибке — полный откат. Бэкенд идемпотентен, двойные тапы безопасны.
   * Удаление дополнительно убирает элемент из видимого списка страницы «Избранное»;
   * добавление в items не вставляем (нет данных карточки) — экран избранного
   * подтянет его очередным fetch().
   */
  async toggle(productId: string) {
    const willBeFavorite = !this.favoriteIds.has(productId);
    const previousItems = this.items;
    const previousIds = new Set(this.favoriteIds);

    runInAction(() => {
      this.pendingIds.add(productId);
      if (willBeFavorite) {
        this.favoriteIds.add(productId);
      } else {
        this.favoriteIds.delete(productId);
        this.items = previousItems.filter((item) => item.id !== productId);
      }
    });

    try {
      if (willBeFavorite) {
        await favoriteApi.add(productId);
      } else {
        await favoriteApi.remove(productId);
      }
      this.persistIds();
    } catch (e) {
      runInAction(() => {
        this.favoriteIds = previousIds;
        this.items = previousItems;
      });
      throw e;
    } finally {
      runInAction(() => {
        this.pendingIds.delete(productId);
      });
    }
  }

  reset() {
    if (this.cacheKey) {
      kvStorage.delete(this.cacheKey);
    }
    this.cacheKey = null;
    this.items = [];
    this.page = 0;
    this.total = 0;
    this.totalPages = 0;
    this.isLoading = false;
    this.isLoadingMore = false;
    this.error = null;
    this.favoriteIds = new Set();
    this.pendingIds = new Set();
  }

  // Сервер сортирует по createdAt DESC и молча выбрасывает удалённые товары,
  // поэтому частичная страница может вернуть меньше элементов, чем size, а id
  // вне запрошенной страницы нам неизвестны — реконсиляция только добавляет
  private reconcile(ids: string[]) {
    ids.forEach((id) => this.favoriteIds.add(id));
    this.persistIds();
  }

  // Авторитетная перестройка Set по серверу (в отличие от reconcile — удаляет лишнее)
  private async fullSync() {
    if (!this.cacheKey || this.isSyncing) return;

    this.isSyncing = true;
    try {
      const ids: string[] = [];
      let page = 0;
      let totalPages = 1;

      while (page < Math.min(totalPages, MAX_SYNC_PAGES)) {
        const result = await favoriteApi.getList({ page, size: SYNC_SIZE });
        ids.push(...result.items.map((item) => item.id));
        totalPages = result.totalPages;
        page += 1;
      }

      runInAction(() => {
        this.favoriteIds = new Set(ids);
      });
      this.persistIds();
    } catch {
      // Сеть недоступна — работаем на локальном кэше до следующего входа
    } finally {
      runInAction(() => {
        this.isSyncing = false;
      });
    }
  }

  private persistIds() {
    if (this.cacheKey) {
      kvStorage.setString(this.cacheKey, JSON.stringify([...this.favoriteIds]));
    }
  }
}

export const favoriteStore = new FavoriteStore();
