import { useFocusEffect, useRouter } from 'expo-router';
import { Heart, HeartOff } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useFavoriteStore } from '@stores/favoriteStore';
import { ProductCard, ProductCardSkeleton } from '@entities/product';
import { ToggleFavoriteButton } from '@features/toggle-favorite';
import { ROUTES, hasNextPage } from '@shared/lib';

const SKELETON_COUNT = 4;

const ListHeader = () => {
  const { t } = useTranslation();

  // Корень таба: без back-кнопки, крупный заголовок в стиле современных шопов
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{t('favorite.title')}</Text>
    </View>
  );
};

const ListFooter = () => {
  const { theme } = useUnistyles();
  const isLoadingMore = useFavoriteStore((s) => s.isLoadingMore);

  if (!isLoadingMore) return null;
  return (
    <View style={styles.footer}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
};

export const FavoritesPage = () => {
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useFavoriteStore((s) => s.items);
  const isLoading = useFavoriteStore((s) => s.isLoading);
  const error = useFavoriteStore((s) => s.error);
  const hasMore = useFavoriteStore((s) => hasNextPage({ page: s.page, totalPages: s.totalPages }));

  // Обновляем при каждом возврате на экран (после тогглов из каталога/детальной
  // сервер уже знает актуальный список) + при первом открытии
  useFocusEffect(
    useCallback(() => {
      useFavoriteStore.getState().fetch();
    }, []),
  );

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={isLoading}
        onRefresh={() => useFavoriteStore.getState().fetch()}
        tintColor={theme.colors.primary}
      />
    ),
    [isLoading, theme.colors.primary],
  );

  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <ListHeader />
        <FlatList
          data={Array.from({ length: SKELETON_COUNT })}
          keyExtractor={(_, i) => `skeleton-${i}`}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={() => <ProductCardSkeleton />}
        />
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <ListHeader />
        <View style={styles.centered}>
          <HeartOff size={40} color={theme.colors.textSecondary} />
          <Text style={styles.centeredText}>{t(`errors.${error}`)}</Text>
          <Pressable onPress={() => useFavoriteStore.getState().fetch()}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <ListHeader />
        <View style={styles.centered}>
          <Heart size={44} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>{t('favorite.empty')}</Text>
          <Text style={styles.emptyHint}>{t('favorite.empty_hint')}</Text>
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
            onPress={() => router.push(ROUTES.tabs.catalog)}
          >
            <Text style={styles.ctaText}>{t('favorite.go_to_catalog')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 12 }]}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            locale={i18n.language}
            onPress={(id) => router.push(ROUTES.product(id))}
            action={<ToggleFavoriteButton productId={item.id} />}
          />
        )}
        onEndReached={() => useFavoriteStore.getState().fetchMore()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        refreshControl={refreshControl}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: theme.gap(1.5), gap: theme.gap(1.5) },
  row: { gap: theme.gap(1.5) },
  header: {
    paddingHorizontal: theme.gap(0.5),
    marginBottom: theme.gap(1),
  },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
  footer: { paddingVertical: theme.gap(2) },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.gap(1.25),
    padding: theme.gap(3),
  },
  centeredText: { color: theme.colors.danger, textAlign: 'center' },
  retryText: { color: theme.colors.primary, fontWeight: '600' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: theme.gap(0.5) },
  emptyHint: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
  cta: {
    marginTop: theme.gap(1.5),
    height: 50,
    paddingHorizontal: theme.gap(3),
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
}));
