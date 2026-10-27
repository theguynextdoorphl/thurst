import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../theme';
import { Button, Field, Sheet } from './ui';

const toDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

/** Calendar picker that stores YYYY-MM-DD. Falls back to typing on web. */
export function DateField({
  label,
  value,
  onChange,
  maximumDate,
  initial,
  clearable,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  maximumDate?: Date;
  initial?: Date;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ? fromDay(value) : (initial ?? new Date()));

  if (Platform.OS === 'web') {
    return <Field label={label} value={value ?? ''} placeholder="YYYY-MM-DD" onChangeText={(t) => onChange(t || undefined)} />;
  }

  return (
    <View style={{ gap: 6 }}>
      <Text style={type.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label}>
        <Text style={[type.body, !value && { color: '#6B6B6B' }]}>
          {value ? fromDay(value).toLocaleDateString() : 'Choose a date'}
        </Text>
      </Pressable>
      {Platform.OS === 'android' ? (
        open ? (
          <DateTimePicker
            value={draft}
            mode="date"
            maximumDate={maximumDate}
            onChange={(e, d) => {
              setOpen(false);
              if (e.type === 'set' && d) onChange(toDay(d));
            }}
          />
        ) : null
      ) : (
        <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            themeVariant="dark"
            maximumDate={maximumDate}
            onChange={(_e, d) => d && setDraft(d)}
          />
          <View style={{ gap: space.card }}>
            <Button
              title="Done"
              onPress={() => {
                onChange(toDay(draft));
                setOpen(false);
              }}
            />
            {clearable && value ? (
              <Button
                title="Clear"
                variant="ghost"
                onPress={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              />
            ) : null}
          </View>
        </Sheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: space.buttonHeight,
    backgroundColor: colors.surface,
    borderRadius: space.radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.pad,
    justifyContent: 'center',
  },
});
