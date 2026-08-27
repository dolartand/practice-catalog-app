import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { productApi } from '../api/product.api';

import type {
  CreateProductRequest,
  CreateSkuRequest,
  ProductListQuery,
  UpdateImageRequest,
  UpdateProductRequest,
  UpdateSkuRequest,
} from './types';

export const productKeys = {
  list: (params: ProductListQuery) => ['products', params] as const,
  allLists: () => ['products'] as const,
  detail: (id: string) => ['product', id] as const,
};

export function useProductsQuery(params: ProductListQuery) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productApi.getList(params),
    placeholderData: keepPreviousData,
  });
}

/** 404 (неактивный/удалённый товар) страница показывает сама — без глобального тоста */
export function useProductQuery(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productApi.getById(id),
    retry: false,
    meta: { skipGlobalError: true },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    // Ошибки полей мапятся в форму; глобальный тост вызывает сама форма
    meta: { skipGlobalError: true },
    mutationFn: (payload: CreateProductRequest) => productApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.allLists() });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { skipGlobalError: true },
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductRequest }) =>
      productApi.update(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(productKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: productKeys.allLists() });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: productKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: productKeys.allLists() });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ── SKU (матрица инвалидации 03 §5: product id + products + stats) ────────

/** Создание SKU: ошибки полей мапятся в модалку — без глобального тоста */
export function useCreateSku(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { skipGlobalError: true },
    mutationFn: (payload: CreateSkuRequest) => productApi.createSku(productId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.allLists() });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

interface SkuMutationVars {
  skuId: string;
  patch?: UpdateSkuRequest;
}

export function useUpdateSku(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ skuId, patch }: SkuMutationVars) =>
      productApi.updateSku(skuId, patch ?? {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.allLists() });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeactivateSku(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skuId: string) => productApi.deactivateSku(skuId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.allLists() });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ── Изображения (03 §5: product id + products) ────────────────────────────

interface UploadImageVars {
  file: File;
  isMain?: boolean;
}

export function useUploadImage(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { skipGlobalError: true },
    mutationFn: ({ file, isMain }: UploadImageVars) =>
      productApi.uploadImage(productId, file, { isMain }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.allLists() });
    },
  });
}

export function useUpdateImage(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageId, patch }: { imageId: string; patch: UpdateImageRequest }) =>
      productApi.updateImage(imageId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.allLists() });
    },
  });
}

export function useDeleteImage(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId: string) => productApi.deleteImage(imageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.allLists() });
    },
  });
}
