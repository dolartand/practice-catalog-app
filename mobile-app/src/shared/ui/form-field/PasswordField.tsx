import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface PasswordFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  errorText?: string;
}

export function PasswordField({ value, onChangeText, placeholder, errorText }: PasswordFieldProps) {
  const { theme } = useUnistyles();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View>
      <View style={[styles.wrapper, errorText && styles.wrapperError]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={!isVisible}
          style={[styles.input, { color: theme.colors.text }]}
        />
        <Pressable onPress={() => setIsVisible((v) => !v)} hitSlop={8}>
          {isVisible ? <EyeOff size={19} color={theme.colors.textSecondary} /> : <Eye size={19} color={theme.colors.textSecondary} />}
        </Pressable>
      </View>
        {errorText && (
            <Text style={{ color: theme.colors.danger, fontSize: 12, marginTop: 4, marginLeft: 4 }}>{errorText}</Text>
        )}    
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.gap(1.5),
    gap: theme.gap(1),
  },
  wrapperError: { borderColor: theme.colors.danger },
  input: { flex: 1, fontSize: 15 },
  errorText: { color: theme.colors.danger, fontSize: 12, marginTop: 4, marginLeft: 4, padding: 0 },
}));