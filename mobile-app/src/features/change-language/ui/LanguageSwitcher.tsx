import { Check, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@shared/i18n';
import { useAppSettingsStore } from '@shared/lib/settings';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ru: 'Русский',
  en: 'English',
  be: 'Беларуская',
  zh: '中文',
};

export const LanguageSwitcher = () => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [isOpen, setIsOpen] = useState(false);
  const current = useAppSettingsStore((s) => s.language);
  const setLanguage = useAppSettingsStore((s) => s.setLanguage);

  return (
    <>
      <Pressable style={styles.row} onPress={() => setIsOpen(true)}>
        <Text style={styles.label}>{t('settings.language')}</Text>
        <View style={styles.rowRight}>
          <Text style={[styles.value, { color: theme.colors.primary }]}>{LANGUAGE_LABELS[current]}</Text>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </View>
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.colors.surface }]} onPress={() => {}}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = lang === current;
              return (
                <Pressable
                  key={lang}
                  style={styles.option}
                  onPress={() => {
                    setLanguage(lang);
                    setIsOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                    {LANGUAGE_LABELS[lang]}
                  </Text>
                  {isActive && <Check size={18} color={theme.colors.primary} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.gap(1),
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: theme.gap(0.75) },
  label: { fontSize: 15, fontWeight: '500', color: theme.colors.text },
  value: { fontSize: 15, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.gap(2),
    gap: theme.gap(0.5),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.gap(1.5),
  },
  optionText: { fontSize: 16, color: theme.colors.text },
  optionTextActive: { fontWeight: '700', color: theme.colors.primary },
}));
