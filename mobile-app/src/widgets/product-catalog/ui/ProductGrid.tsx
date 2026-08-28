import { useCallback, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { ProductCard, ProductCardSkeleton, type ProductListItem } from '@entities/product';

interface ProductGridProps {
  products: ProductListItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  locale: string;
  onEndReached: () => void;
  onProductPress: (id: string) => void;
  onRetry: () => void;
  /** Слот действия на каждой карточке (например, кнопка избранного) */
  renderItemAction?: (product: ProductListItem) => ReactElement;
  emptyText?: string;
}

const SKELETON_COUNT = 6;

export function ProductGrid({
  products,
  isLoading,
  isLoadingMore,
  error,
  locale,
  onEndReached,
  onProductPress,
  onRetry,
  renderItemAction,
  emptyText,
}: ProductGridProps) {
  const { t } = useTranslation();

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator />
      </View>
    );
  }, [isLoadingMore]);

  if (isLoading) {
    return (
      <FlatList
        data={Array.from({ length: SKELETON_COUNT })}
        keyExtractor={(_, i) => `skeleton-${i}`}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={() => <ProductCardSkeleton />}
      />
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{t(`errors.${error}`)}</Text>
        <Text style={styles.retryText} onPress={onRetry}>
          {t('common.retry')}
        </Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{emptyText ?? t('catalog.empty')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <ProductCard
          product={item}
          locale={locale}
          onPress={onProductPress}
          action={renderItemAction?.(item)}
        />
      )}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListFooterComponent={renderFooter}
      maxToRenderPerBatch={8}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  list: { padding: theme.gap(1.5), gap: theme.gap(1.5) },
  row: { gap: theme.gap(1.5) },
  footer: { paddingVertical: theme.gap(2) },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.gap(3) },
  errorText: { color: theme.colors.danger, marginBottom: theme.gap(1) },
  retryText: { color: theme.colors.primary, fontWeight: '600' },
  emptyText: { color: theme.colors.textSecondary },
}));