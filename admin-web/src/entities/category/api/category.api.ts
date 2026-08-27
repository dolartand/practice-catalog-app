import type {
  AdminCategoryNode,
  CategoryNode,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';


export const categoryApi = {
  /** Публичное дерево — только активные категории (для выбора категории товара) */
  async getTree(): Promise<CategoryNode[]> {
    const { data } = await httpClient.get<CategoryNode[]>(API_ENDPOINTS.categories.root);
    return data;
  },

  /** Полное дерево вкл. неактивные/удалённые (для управления каталогом) */
  async getFullTree(): Promise<AdminCategoryNode[]> {
    const { data } = await httpClient.get<AdminCategoryNode[]>(API_ENDPOINTS.categories.adminRoot);
    return data;
  },

  async create(payload: CreateCategoryRequest): Promise<CategoryNode> {
    const { data } = await httpClient.post<CategoryNode>(API_ENDPOINTS.categories.adminRoot, payload);
    return data;
  },

  async update(id: string, payload: UpdateCategoryRequest): Promise<CategoryNode> {
    const { data } = await httpClient.patch<CategoryNode>(
      API_ENDPOINTS.categories.adminById(id),
      payload,
    );
    return data;
  },

  /** Soft delete; 409 при наличии неудалённых товаров или подкатегорий */
  async delete(id: string): Promise<void> {
    await httpClient.delete(API_ENDPOINTS.categories.adminById(id));
  },
};
