import { CategoryTreeEditor } from '@features/category-tree-editor';
import { PageHeader } from '@shared/ui';

export function CategoriesPage() {
  return (
    <>
      <PageHeader
        title="Категории"
        subtitle="Полное дерево каталога: перетаскивайте узлы для переноса, скрытые категории помечены оранжевым"
      />
      <CategoryTreeEditor />
    </>
  );
}
