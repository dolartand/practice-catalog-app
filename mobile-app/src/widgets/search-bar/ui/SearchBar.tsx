import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useProductSuggestions } from '@features/search-products';
import { formatMoney } from '@shared/lib';

interface SearchBarProps {
  onSubmit: (query: string) => void;
  onSuggestionPress: (id: string) => void;
  locale: string;
}

export function SearchBar({ onSubmit, onSuggestionPress, locale }: SearchBarProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const { suggestions, search, clear } = useProductSuggestions();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (text: string) => {
    setQuery(text);
    search(text);
  };

  const showDropdown = isFocused && suggestions.length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <Search size={18} color={theme.colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onSubmitEditing={() => onSubmit(query)}
          placeholder={t('catalog.search_placeholder')}
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.input, { color: theme.colors.text }]}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); clear(); }} hitSlop={8}>
            <X size={18} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          {suggestions.map((item) => (
            <Pressable
              key={item.id}
              style={styles.suggestionRow}
              onPress={() => {
                setQuery(item.name);
                onSuggestionPress(item.id);
                clear();
              }}
            >
              <Image source={{ uri: item.mainImageUrl ?? undefined }} style={styles.suggestionImage} />
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.suggestionPrice}>{formatMoney(item.priceWithDiscountCents, locale)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: { flex: 1, position: 'relative', zIndex: 10 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.gap(1),
    backgroundColor: theme.colors.surface, borderRadius: 14, paddingHorizontal: theme.gap(1.5),
    height: 46, borderWidth: 1, borderColor: theme.colors.border,
  },
  input: { flex: 1, fontSize: 15 },
  dropdown: {
    position: 'absolute', top: 52, left: 0, right: 0,
    backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border,
    paddingVertical: theme.gap(0.5),
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: theme.gap(1), paddingHorizontal: theme.gap(1.5), paddingVertical: theme.gap(1) },
  suggestionImage: { width: 36, height: 36, borderRadius: 8, backgroundColor: theme.colors.background },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 14, color: theme.colors.text },
  suggestionPrice: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
}));