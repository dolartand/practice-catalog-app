// src/widgets/category-drawer/ui/CategoryTreeItem.tsx - рекурсивный узел дерева категорий, который отображает категорию и её дочерние категории (если они есть).
import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import type { CategoryNode } from '@entities/category';

interface CategoryTreeItemProps {
  node: CategoryNode;
  depth: number;
  selectedId: string | null;
  onSelect: (node: CategoryNode) => void;
}

export function CategoryTreeItem({ node, depth, selectedId, onSelect }: CategoryTreeItemProps) {
  const { theme } = useUnistyles();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <View>
      <Pressable
        onPress={() => onSelect(node)}
        style={[styles.row, { paddingLeft: theme.gap(2) + depth * theme.gap(2.5) }, isSelected && styles.rowSelected]}
      >
        {hasChildren ? (
          <Pressable
            hitSlop={10}
            onPress={(e) => {
              e.stopPropagation();
              setIsExpanded((v) => !v);
            }}
            style={styles.chevronButton}
          >
            <ChevronRight
              size={16}
              color={theme.colors.textSecondary}
              style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
            />
          </Pressable>
        ) : (
          <View style={styles.chevronButton} />
        )}

        <Text style={[styles.label, isSelected && styles.labelSelected]} numberOfLines={1}>
          {node.name}
        </Text>
      </Pressable>

      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <CategoryTreeItem key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: theme.gap(2),
    paddingVertical: theme.gap(1.1),
    gap: theme.gap(1),
  },
  rowSelected: { backgroundColor: `${theme.colors.primary}14` },
  chevronButton: { width: 24, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, color: theme.colors.text, flex: 1 },
  labelSelected: { color: theme.colors.primary, fontWeight: '700' },
}));