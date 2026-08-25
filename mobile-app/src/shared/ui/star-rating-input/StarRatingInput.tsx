import { Star } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface StarRatingInputProps {
  value: number | null;
  onChange: (value: number) => void;
  size?: number;
  disabled?: boolean;
}

export function StarRatingInput({ value, onChange, size = 32, disabled }: StarRatingInputProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => !disabled && onChange(star)}
          disabled={disabled}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={String(star)}
        >
          <Star
            size={size}
            color={star <= (value ?? 0) ? theme.colors.star : theme.colors.border}
            fill={star <= (value ?? 0) ? theme.colors.star : 'transparent'}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', gap: theme.gap(1), alignItems: 'center' },
}));
