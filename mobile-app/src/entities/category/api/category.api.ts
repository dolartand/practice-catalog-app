import type { CategoryNode } from '../model/types';

import { API_ENDPOINTS, httpClient } from '@shared/api';


export const categoryApi = {
  async getTree(): Promise<CategoryNode[]> {
    const { data } = await httpClient.get<CategoryNode[]>(API_ENDPOINTS.categories.root);
    return data;
  },
};
