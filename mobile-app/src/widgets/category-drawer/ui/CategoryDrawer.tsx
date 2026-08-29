import { X } from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { CategoryTreeItem } from './CategoryTreeItem';

import type { CategoryNode } from '@entities/category';


const DRAWER_WIDTH = Math.round(Dimensions.get('window').width * 0.8);

interface CategoryDrawerProps {
  visible: boolean;
  tree: CategoryNode[];
  selectedId: string | null;
  onSelect: (node: CategoryNode | null) => void;
  onClose: () => void;
}

export function CategoryDrawer({ visible, tree, selectedId, onSelect, onClose }: CategoryDrawerProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();

  const translateX = useSharedValue(-DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(visible ? 0 : -DRAWER_WIDTH, { duration: 220 });
    backdropOpacity.value = withTiming(visible ? 1 : 0, { duration: 220 });
  }, [visible]);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  // Drawer остаётся смонтированным всегда (не под условным рендером) —
  // так анимация закрытия успевает доиграть
  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, { width: DRAWER_WIDTH, paddingTop: insets.top + 16 }, panelStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('catalog.categories_title')}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          <Pressable
            onPress={() => onSelect(null)}
            style={[styles.row, selectedId === null && styles.rowSelected]}
          >
            <Text style={[styles.label, selectedId === null && styles.labelSelected]}>
              {t('catalog.all_categories')}
            </Text>
          </Pressable>

          {tree.map((node) => (
            <CategoryTreeItem
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={(selected) => onSelect(selected)}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: { zIndex: 50, elevation: 20 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.background,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 21,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.gap(2),
    paddingBottom: theme.gap(2),
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  row: { paddingHorizontal: theme.gap(2), paddingVertical: theme.gap(1.1) },
  rowSelected: { backgroundColor: `${theme.colors.primary}14` },
  label: { fontSize: 15, color: theme.colors.text, fontWeight: '600' },
  labelSelected: { color: theme.colors.primary },
}));