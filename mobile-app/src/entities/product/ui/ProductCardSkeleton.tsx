import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Skeleton } from '@shared/ui';

export function ProductCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton style={styles.image} radius={12} />
      <Skeleton style={styles.line} radius={6} />
      <Skeleton style={styles.lineShort} radius={6} />
      <Skeleton style={styles.price} radius={6} />
      <Skeleton style={styles.rating} radius={6} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.gap(1.5),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  image: { width: '100%', aspectRatio: 1, marginBottom: theme.gap(1) },
  line: { height: 14, width: '90%', marginBottom: theme.gap(0.5) },
  lineShort: { height: 14, width: '60%', marginBottom: theme.gap(1) },
  price: { height: 16, width: '40%' },
  rating: { height: 12, width: '35%', marginBottom: theme.gap(0.5) },
}));