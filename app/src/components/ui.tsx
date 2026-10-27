import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Animated, Easing, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, gradient, motion, shadow, space, type } from '../theme';

export function Screen({
  children,
  scroll = true,
  footer,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  style?: ViewStyle;
}) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={[styles.screenBody, style]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenBody, { flex: 1 }, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FadeIn style={{ flex: 1 }}>{body}</FadeIn>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function FadeIn({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: motion.fade, useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={type.headline}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={[type.subheadline, { marginBottom: space.card }]}>{children}</Text>;
}

export function Body({ children, muted, center }: { children: ReactNode; muted?: boolean; center?: boolean }) {
  return (
    <Text style={[type.body, muted && { color: colors.textMuted }, center && { textAlign: 'center' }]}>{children}</Text>
  );
}

export function Caption({ children, center }: { children: ReactNode; center?: boolean }) {
  return <Text style={[type.caption, center && { textAlign: 'center' }]}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={[type.caption, { color: '#FF6B6B', fontWeight: '500' }]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.timing(scale, { toValue: v, duration: motion.press, useNativeDriver: true }).start();
  return { scale, onPressIn: () => to(0.96), onPressOut: () => to(1) };
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const inactive = disabled || loading;
  const label = loading ? (
    <ActivityIndicator color={variant === 'secondary' ? colors.mango : colors.text} />
  ) : (
    <Text style={[type.button, variant === 'secondary' && { color: colors.mango }]}>{title}</Text>
  );
  return (
    <Animated.View style={[{ transform: [{ scale }], opacity: inactive ? 0.5 : 1 }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {variant === 'primary' ? (
          <LinearGradient colors={gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.button}>
            {label}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.button,
              variant === 'secondary' && { backgroundColor: colors.blue },
              variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
              variant === 'danger' && { backgroundColor: colors.red },
            ]}
          >
            {label}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={type.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#6B6B6B"
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[styles.input, focused && { borderColor: colors.mango }, props.multiline && { minHeight: 88 }]}
      />
      {hint ? <Caption>{hint}</Caption> : null}
    </View>
  );
}

/** Dropdown with a blank default, as the spec asks for every profile question. */
export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  blank = 'Not set',
}: {
  label: string;
  options: readonly T[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  blank?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={type.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label}>
        <Text style={[type.body, !value && { color: '#6B6B6B' }]}>{value ?? blank}</Text>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <FlatList
          data={[undefined, ...options]}
          keyExtractor={(o) => o ?? '__blank'}
          renderItem={({ item }) => (
            <Pressable
              style={styles.option}
              onPress={() => {
                onChange(item);
                setOpen(false);
              }}
            >
              <Text style={[type.body, item === value && { color: colors.mango, fontWeight: '700' }, !item && { color: colors.textMuted }]}>
                {item ?? blank}
              </Text>
            </Pressable>
          )}
        />
      </Sheet>
    </View>
  );
}

/** Select-all-that-apply chips. */
export function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T[] | undefined;
  onChange: (v: T[]) => void;
}) {
  const selected = value ?? [];
  return (
    <View style={styles.field}>
      <Text style={type.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <Pressable
              key={o}
              onPress={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <Text style={[type.caption, { color: on ? colors.bg : colors.text, fontWeight: on ? '500' : '400' }]}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={[styles.segment, o === value && { backgroundColor: colors.blue }]}>
          <Text style={[type.button, { color: o === value ? colors.mango : colors.textMuted }]}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView style={styles.sheet} edges={['bottom']}>
        <View style={styles.sheetHandle} />
        <Text style={[type.subheadline, { marginBottom: space.card }]}>{title}</Text>
        {children}
      </SafeAreaView>
    </Modal>
  );
}

/** Seconds left until `endsAt`, ticking every quarter second. */
export function useCountdown(endsAt: number | undefined): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** A bar that drains smoothly from full to empty over the time left. */
export function TimerBar({ endsAt, total, urgentBelow }: { endsAt: number; total: number; urgentBelow: number }) {
  const left = useCountdown(endsAt);
  const progress = useRef(new Animated.Value(Math.max(0, (endsAt - Date.now()) / (total * 1000)))).current;
  useEffect(() => {
    const remaining = Math.max(0, endsAt - Date.now());
    progress.setValue(remaining / (total * 1000));
    Animated.timing(progress, { toValue: 0, duration: remaining, easing: Easing.linear, useNativeDriver: false }).start();
  }, [endsAt, total, progress]);
  const urgent = left <= urgentBelow;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[type.label, urgent && { color: '#FF6B6B' }]}>{urgent ? 'Almost out of time' : 'Time left'}</Text>
        <Text style={[type.button, { fontVariant: ['tabular-nums'] }, urgent && { color: '#FF6B6B' }]}>{mmss(left)}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={{
            height: '100%',
            width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            overflow: 'hidden',
            borderRadius: 3,
          }}
        >
          <LinearGradient
            colors={urgent ? [colors.red, colors.red] : gradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

export function Center({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.pad, padding: space.pad }}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenBody: { padding: space.pad, gap: space.pad, paddingBottom: space.section * 2 },
  footer: { padding: space.pad, gap: space.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  card: { backgroundColor: colors.surface, borderRadius: space.radius, padding: space.pad, gap: space.card, ...shadow },
  button: {
    height: space.buttonHeight,
    borderRadius: space.radius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.pad,
  },
  field: { gap: 6 },
  input: {
    minHeight: space.buttonHeight,
    backgroundColor: colors.surface,
    borderRadius: space.radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.pad,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    justifyContent: 'center',
  },
  option: { minHeight: space.touch, justifyContent: 'center', paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.mango, borderColor: colors.mango },
  segmented: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: space.radius, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: space.pad,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: space.card },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
});
