// Для inStock/onlyDiscounted — не системный Switch 
// (он плохо стилизуется под бренд-цвета на Android),
//  а собственный, переиспользуемый
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface SegmentedToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function SegmentedToggle({ value, onChange }: SegmentedToggleProps) {
  const { theme } = useUnistyles();

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(value ? 20 : 2, { duration: 160 }) }],
  }));

  return (
    <Pressable onPress={() => onChange(!value)} style={[styles.track, value && { backgroundColor: theme.colors.primary }]}>
      <Animated.View style={[styles.knob, knobStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
  },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
}));