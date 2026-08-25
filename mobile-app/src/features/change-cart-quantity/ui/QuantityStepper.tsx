import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface QuantityStepperProps {
  value: number;
  disabled?: boolean;
  onChange: (quantity: number) => void; // 0 — вызывающая сторона трактует как удаление
}

const MAX_QUANTITY = 999;

export function QuantityStepper({ value, disabled, onChange }: QuantityStepperProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.wrapper}>
      <Pressable disabled={disabled} onPress={() => onChange(value - 1)} style={styles.button} hitSlop={6}>
        <Minus size={14} color={theme.colors.text} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        disabled={disabled || value >= MAX_QUANTITY}
        onPress={() => onChange(Math.min(value + 1, MAX_QUANTITY))}
        style={styles.button}
        hitSlop={6}
      >
        <Plus size={14} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    flexDirection: 'row', alignItems: 'center', gap: theme.gap(1),
    backgroundColor: theme.colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: theme.colors.border,
    paddingHorizontal: theme.gap(0.75), paddingVertical: theme.gap(0.4),
  },
  button: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 14, fontWeight: '600', color: theme.colors.text, minWidth: 20, textAlign: 'center' },
}));