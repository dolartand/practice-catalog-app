import type { Product, ProductListParams, ProductsPage } from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';


export const productApi = {
  async getList(params: ProductListParams = {}): Promise<ProductsPage> {
    const { data } = await httpClient.get<ProductsPage>(API_ENDPOINTS.products.list, { params });
    return data;
  },

  async getById(id: string): Promise<Product> {
    const { data } = await httpClient.get<Product>(API_ENDPOINTS.products.byId(id));
    return data;
  },
};
