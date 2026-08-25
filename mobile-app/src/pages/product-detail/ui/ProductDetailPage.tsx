import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useProductStore, resolveSkuPrice, type Product, type ProductSku } from '@entities/product';
import { AddToCartButton } from '@features/add-to-cart';
import { ToggleFavoriteButton } from '@features/toggle-favorite';
import { parseApiError, type AppError } from '@shared/api';
import { formatMoney, useErrorMessage } from '@shared/lib';
import { ProductGallery } from '@widgets/product-gallery';
import { ProductReviews } from '@widgets/product-reviews';
import { ProductSpecs } from '@widgets/product-specs';
import { SkuSelector } from '@widgets/sku-selector';

export function ProductDetailPage() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { t, i18n } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const productStore = useProductStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSku, setSelectedSku] = useState<ProductSku | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const errorMessage = useErrorMessage(error);

  useEffect(() => {
    let isCancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await productStore.fetchOne(productId);
        if (isCancelled) return;
        setProduct(result);

        const activeSkus = result.skus.filter((sku) => sku.isActive);
        const firstAvailable = activeSkus.find((sku) => sku.stockQty > 0) ?? activeSkus[0] ?? null;
        setSelectedSku(firstAvailable);
      } catch (e) {
        if (!isCancelled) setError(parseApiError(e));
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [productId]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>{errorMessage?.title}</Text>
        <Text style={styles.errorDetail}>{errorMessage?.detail}</Text>
      </View>
    );
  }

  const priceInfo = selectedSku ? resolveSkuPrice(product, selectedSku) : null;

  return (
    <View style={styles.container}>
      <ScrollView bounces={false}>
        <View>
          <ProductGallery images={product.images} />
          <Pressable style={[styles.backButton, { top: insets.top + 12 }]} onPress={() => router.back()}>
            <ChevronLeft size={22} color="#fff" />
          </Pressable>
          <View style={[styles.favoriteButton, { top: insets.top + 12 }]}>
            <ToggleFavoriteButton productId={product.id} size={40} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.name}>{product.name}</Text>

          {product.ratingCount > 0 && (
            <View style={styles.ratingRow}>
              <Star size={14} color={theme.colors.star} fill={theme.colors.star} />
              <Text style={styles.ratingText}>
                {product.ratingAverage.toFixed(1)} · {t('product.reviews_count', { count: product.ratingCount })}
              </Text>
            </View>
          )}

          {priceInfo && (
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formatMoney(priceInfo.priceWithDiscountCents, i18n.language)}</Text>
              {priceInfo.hasDiscount && (
                <Text style={styles.oldPrice}>{formatMoney(priceInfo.priceCents, i18n.language)}</Text>
              )}
            </View>
          )}

          <SkuSelector
            product={product}
            selectedSkuId={selectedSku?.id ?? null}
            locale={i18n.language}
            onSelect={setSelectedSku}
          />

          {product.description && <Text style={styles.description}>{product.description}</Text>}

          <ProductSpecs product={product} />

          <ProductReviews product={product} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <AddToCartButton skuId={selectedSku?.id ?? null} disabled={!selectedSku || selectedSku.stockQty === 0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.gap(1), padding: theme.gap(3) },
  errorTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.danger },
  errorDetail: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
  backButton: {
    position: 'absolute', left: theme.gap(1.5),
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.scrim, alignItems: 'center', justifyContent: 'center',
  },
  favoriteButton: { position: 'absolute', right: theme.gap(1.5) },
  content: { padding: theme.gap(2), gap: theme.gap(2) },
  name: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -theme.gap(1) },
  ratingText: { fontSize: 13, color: theme.colors.textSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: theme.gap(1) },
  price: { fontSize: 26, fontWeight: '800', color: theme.colors.primary },
  oldPrice: { fontSize: 16, color: theme.colors.textSecondary, textDecorationLine: 'line-through' },
  description: { fontSize: 14, lineHeight: 21, color: theme.colors.text },
  footer: { padding: theme.gap(2), borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background },
}));