import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { categoryApi } from '../api/category.api';

import type { CreateCategoryRequest, UpdateCategoryRequest } from './types';

export const categoryKeys = {
  all: () => ['categories'] as const,
  publicTree: () => ['categories', 'public'] as const,
  adminTree: () => ['categories', 'admin'] as const,
};

/** Активные категории (публичный контракт) — выбор категории в формах */
export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.publicTree(),
    queryFn: categoryApi.getTree,
  });
}

/** Полное дерево вкл. скрытые/удалённые — управление каталогом */
export function useAdminCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.adminTree(),
    queryFn: categoryApi.getFullTree,
  });
}

/** Матрица инвалидации 03 §5: categories + products + stats */

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { skipGlobalError: true },
    mutationFn: (payload: CreateCategoryRequest) => categoryApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all() });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { skipGlobalError: true },
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryRequest }) =>
      categoryApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all() });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  // Без skipGlobalError: detail из 409 показывается глобальным тостом
  return useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all() });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
