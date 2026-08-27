import type {
  AdminProductsPage,
  CreateProductRequest,
  CreateSkuRequest,
  Product,
  ProductImage,
  ProductListPage,
  ProductsPage,
  ProductListQuery,
  ProductSku,
  UpdateImageRequest,
  UpdateProductRequest,
  UpdateSkuRequest,
} from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';
import { features } from '@shared/config';

export const productApi = {
  /**
   * Список для таблицы: админский (любой статус) либо публичный поиск
   * — в зависимости от флага features.gaps.adminProductList.
   */
  async getList(params: ProductListQuery): Promise<ProductListPage> {
    if (features.gaps.adminProductList) {
      // Админский контракт поддерживает только q/categoryId/sort/page/size + status
      const { status, ...adminParams } = params;
      const { data } = await httpClient.get<AdminProductsPage>(API_ENDPOINTS.products.adminRoot, {
        params: { ...adminParams, status: status ?? 'ACTIVE' },
      });
      return data;
    }

    const { data } = await httpClient.get<ProductsPage>(API_ENDPOINTS.products.list, { params });
    return data;
  },

  /** Карточка товара любого статуса; публичная — только флаг выключен */
  async getById(id: string): Promise<Product> {
    const url = features.gaps.adminProductList
      ? API_ENDPOINTS.products.adminById(id)
      : API_ENDPOINTS.products.byId(id);
    const { data } = await httpClient.get<Product>(url);
    return data;
  },

  async create(payload: CreateProductRequest): Promise<Product> {
    const { data } = await httpClient.post<Product>(API_ENDPOINTS.products.adminRoot, payload);
    return data;
  },

  async update(id: string, payload: UpdateProductRequest): Promise<Product> {
    const { data } = await httpClient.patch<Product>(API_ENDPOINTS.products.adminById(id), payload);
    return data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.products.adminById(id));
  },

  // ── SKU ─────────────────────────────────────────────────────────────────

  async createSku(productId: string, payload: CreateSkuRequest): Promise<ProductSku> {
    const { data } = await httpClient.post<ProductSku>(
      API_ENDPOINTS.products.skus(productId),
      payload,
    );
    return data;
  },

  async updateSku(skuId: string, payload: UpdateSkuRequest): Promise<ProductSku> {
    const { data } = await httpClient.patch<ProductSku>(API_ENDPOINTS.skus.byId(skuId), payload);
    return data;
  },

  /** DELETE /admin/skus/{id} — деактивация варианта (не физическое удаление) */
  async deactivateSku(skuId: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.skus.byId(skuId));
  },

  // ── Изображения ─────────────────────────────────────────────────────────

  async uploadImage(
    productId: string,
    file: File,
    options: { position?: number; isMain?: boolean } = {},
  ): Promise<ProductImage> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.position != null) formData.append('position', String(options.position));
    if (options.isMain != null) formData.append('isMain', String(options.isMain));

    const { data } = await httpClient.post<ProductImage>(
      API_ENDPOINTS.products.images(productId),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  async updateImage(imageId: string, payload: UpdateImageRequest): Promise<ProductImage> {
    const { data } = await httpClient.patch<ProductImage>(
      API_ENDPOINTS.images.byId(imageId),
      payload,
    );
    return data;
  },

  /** Удаляет запись и файл из MinIO */
  async deleteImage(imageId: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.images.byId(imageId));
  },
};
