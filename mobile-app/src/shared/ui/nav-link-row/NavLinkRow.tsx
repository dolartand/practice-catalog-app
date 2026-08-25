import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface NavLinkRowProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

export function NavLinkRow({ icon: Icon, label, onPress, danger }: NavLinkRowProps) {
  const { theme } = useUnistyles();
  const color = danger ? theme.colors.danger : theme.colors.text;

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.left}>
        <Icon size={19} color={color} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
      <ChevronRight size={18} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.gap(1.25) },
  left: { flexDirection: 'row', alignItems: 'center', gap: theme.gap(1.25) },
  label: { fontSize: 15, fontWeight: '500' },
}));