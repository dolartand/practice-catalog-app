import { useRouter } from 'expo-router';
import { Menu, SlidersHorizontal, X } from 'lucide-react-native';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useCategoryStore, type CategoryNode } from '@entities/category';
import { useProductStore } from '@entities/product';
import { EMPTY_DRAFT, draftToParams, countActiveFilters, type FiltersDraft } from '@features/filter-products';
import { ToggleFavoriteButton } from '@features/toggle-favorite';
import { ROUTES } from '@shared/lib';
import { CategoryDrawer } from '@widgets/category-drawer';
import { FiltersModal } from '@widgets/filters-modal';
import { ProductGrid } from '@widgets/product-catalog/ui/ProductGrid';
import { SearchBar } from '@widgets/search-bar/ui/SearchBar';


export const CatalogPage = observer(() => {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const productStore = useProductStore();
  const categoryStore = useCategoryStore();

  const [filtersVisible, setFiltersVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [filtersDraft, setFiltersDraft] = useState<FiltersDraft>(EMPTY_DRAFT);
  const activeFiltersCount = countActiveFilters(filtersDraft);

  useEffect(() => {
    productStore.fetchList();
    categoryStore.fetchTree();
  }, []);

  const handleSelectCategory = (node: CategoryNode | null) => {
    setSelectedCategory(node);
    setDrawerVisible(false);
  productStore.fetchList({ categoryId: node?.id, ...draftToParams(filtersDraft) });
  };

  const handleApplyFilters = (draft: FiltersDraft) => {
    setFiltersDraft(draft);
    setFiltersVisible(false);
    productStore.fetchList({ categoryId: selectedCategory?.id, ...draftToParams(draft) });
  };

  const handleProductPress = (id: string) => router.push(ROUTES.product(id));

  const renderFavoriteAction = useCallback((productId: string) => <ToggleFavoriteButton productId={productId} />, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.searchRow}>
          <Pressable style={styles.iconButton} onPress={() => setDrawerVisible(true)}>
            <Menu size={20} color={theme.colors.text} />
          </Pressable>

          <SearchBar
            onSubmit={(query) => productStore.fetchList({ q: query, categoryId: selectedCategory?.id })}
            onSuggestionPress={handleProductPress}
            locale={i18n.language}
          />

          <Pressable style={styles.iconButton} onPress={() => setFiltersVisible(true)}>
            <SlidersHorizontal size={20} color={theme.colors.text}/>
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {selectedCategory && (
          <View style={styles.activeCategoryRow}>
            <Text style={styles.activeCategoryText}>{selectedCategory.name}</Text>
            <Pressable onPress={() => handleSelectCategory(null)} hitSlop={8}>
              <X size={14} color={theme.colors.primary} />
            </Pressable>
          </View>
        )}
      </View>

      <ProductGrid
        products={productStore.list}
        isLoading={productStore.isLoading}
        isLoadingMore={productStore.isLoadingMore}
        error={productStore.error}
        locale={i18n.language}
        onEndReached={() => productStore.fetchMore()}
        onProductPress={handleProductPress}
        onRetry={() => productStore.fetchList({ categoryId: selectedCategory?.id })}
        renderItemAction={(product) => renderFavoriteAction(product.id)}
      />

      <FiltersModal
        visible={filtersVisible}
        initialDraft={filtersDraft}
        onClose={() => setFiltersVisible(false)}
        onApply={handleApplyFilters}
      />

      <CategoryDrawer
        visible={drawerVisible}
        tree={categoryStore.tree}
        selectedId={selectedCategory?.id ?? null}
        onSelect={handleSelectCategory}
        onClose={() => setDrawerVisible(false)}
      />
    </View>
  );
});

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: theme.gap(1.5), paddingBottom: theme.gap(1) },
  searchRow: { flexDirection: 'row', gap: theme.gap(1), alignItems: 'flex-start' },
  iconButton: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
    position: 'relative' 
  },
  activeCategoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.gap(0.75),
    marginTop: theme.gap(1), alignSelf: 'flex-start',
    backgroundColor: `${theme.colors.primary}14`, borderRadius: 10,
    paddingHorizontal: theme.gap(1.25), paddingVertical: theme.gap(0.5),
  },
  activeCategoryText: { color: theme.colors.primary, fontSize: 13, fontWeight: '600' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: theme.colors.danger,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
}));