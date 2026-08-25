import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

interface FormFieldProps extends TextInputProps {
  errorText?: string;
}

export function FormField({ errorText, style, ...inputProps }: FormFieldProps) {
  const { theme } = useUnistyles();

  return (
    <View>
      <TextInput
        {...inputProps}
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.input, errorText && styles.inputError, { color: theme.colors.text }, style]}
      />
      {errorText && <Text style={styles.errorText}>{errorText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.gap(1.5),
    fontSize: 15,
  },
  inputError: { borderColor: theme.colors.danger },
  errorText: { color: theme.colors.danger, fontSize: 12, marginTop: 4, marginLeft: 4 },
}));