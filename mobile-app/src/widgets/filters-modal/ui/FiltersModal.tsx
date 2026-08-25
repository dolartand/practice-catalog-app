import { X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { EMPTY_DRAFT, type FiltersDraft, FiltersForm } from '@features/filter-products';

interface FiltersModalProps {
  visible: boolean;
  initialDraft: FiltersDraft;
  onClose: () => void;
  onApply: (draft: FiltersDraft) => void;
}

export function FiltersModal({ visible, initialDraft, onClose, onApply }: FiltersModalProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [draft, setDraft] = useState<FiltersDraft>(initialDraft);

  // Синк черновика при каждом открытии — если модалку открыли повторно
  // после применения фильтров, форма должна показывать уже применённые значения
  const handleShow = () => setDraft(initialDraft);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} onShow={handleShow}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('catalog.filters_title')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={theme.colors.text} />
            </Pressable>
          </View>

          <FiltersForm draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />

          <View style={styles.footer}>
            <Pressable
              style={styles.resetButton}
              onPress={() => {
                setDraft(EMPTY_DRAFT);
                onApply(EMPTY_DRAFT);
              }}
            >
              <Text style={styles.resetText}>{t('filters.reset')}</Text>
            </Pressable>
            <Pressable style={styles.applyButton} onPress={() => onApply(draft)}>
              <Text style={styles.applyText}>{t('filters.apply')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: theme.gap(2.5), paddingBottom: theme.gap(1.5),
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  footer: {
    flexDirection: 'row', gap: theme.gap(1.5),
    padding: theme.gap(2.5), paddingTop: theme.gap(1.5),
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  resetButton: {
    flex: 1, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  resetText: { color: theme.colors.text, fontWeight: '600' },
  applyButton: {
    flex: 2, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  applyText: { color: '#fff', fontWeight: '700' },
}));