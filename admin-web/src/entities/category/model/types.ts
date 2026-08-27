export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  children: CategoryNode[];
}

/** Узел полного дерева для админа (GET /admin/categories) */
export interface AdminCategoryNode extends Omit<CategoryNode, 'children'> {
  /** false — скрыта из публичного каталога */
  isActive: boolean;
  /** Момент мягкого удаления; null — не удалена */
  deletedAt: string | null;
  /** Число неудалённых товаров в категории */
  activeProductCount: number;
  children: AdminCategoryNode[];
}

// ── Запросы админа ────────────────────────────────────────────────────────

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  parentId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
}

/**
 * PATCH частичный: null = поле не менять (семантика бэкенда).
 * Следствие: перенести категорию в корень нельзя — только под другого родителя.
 */
export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  parentId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
   /** null = не менять (частичный PATCH бэкенда) */
  sortOrder?: number | null;
  isActive?: boolean;
}
