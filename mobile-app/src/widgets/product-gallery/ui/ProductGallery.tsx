import { useState } from 'react';
import { Dimensions, FlatList, Image, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { ProductImage } from '@entities/product';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ProductGallery({ images }: { images: ProductImage[] }) {
  const { theme } = useUnistyles();
  const [activeIndex, setActiveIndex] = useState(0);

  const sorted = [...images].sort((a, b) => (a.isMain === b.isMain ? a.position - b.position : a.isMain ? -1 : 1));

  if (sorted.length === 0) {
    return <View style={[styles.image, { backgroundColor: theme.colors.surface }]} />;
  }

  return (
    <View>
      <FlatList
        data={sorted}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
        renderItem={({ item }) => <Image source={{ uri: item.url }} style={styles.image} />}
      />
      {sorted.length > 1 && (
        <View style={styles.dots}>
          {sorted.map((item, index) => (
            <View
              key={item.id}
              style={[styles.dot, index === activeIndex && { backgroundColor: theme.colors.primary, width: 18 }]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  image: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: theme.colors.background },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, position: 'absolute', bottom: theme.gap(1.5), left: 0, right: 0 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
}));