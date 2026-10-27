import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthImage } from '../../components/profile-view';
import { Caption, Card, ErrorText } from '../../components/ui';
import { currentCoords, useLive } from '../../live';
import { useMe } from '../../session';
import { colors, gradient, motion, space, type } from '../../theme';

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Enable', onPress: () => resolve(true) },
    ]),
  );
}

/** Rings that pulse outward while you're in the queue. */
function Pulse({ active }: { active: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return t.setValue(0);
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, t]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulse,
        {
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
        },
      ]}
    />
  );
}

export default function Home() {
  const me = useMe();
  const { state, connected, setAvailable } = useLive();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scale = useRef(new Animated.Value(1)).current;
  const available = state.available;

  const toggle = async () => {
    setError('');
    setBusy(true);
    try {
      if (available) {
        await setAvailable(false);
      } else {
        const ok = await confirm('Go available?', 'Enable location services to find matches near you?');
        if (!ok) return;
        await setAvailable(true, await currentCoords());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const press = (v: number) => Animated.timing(scale, { toValue: v, duration: motion.press, useNativeDriver: true }).start();
  const filled = Object.keys(me.profile).length;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={[type.headline, { letterSpacing: 1 }]}>Thurst</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => router.push('/me')} style={styles.iconButton} accessibilityLabel="My profile">
            {me.photos[0] ? (
              <AuthImage photo={me.photos[0]} size={36} style={{ borderRadius: 18 }} />
            ) : (
              <Ionicons name="person-circle-outline" size={32} color={colors.mango} />
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} style={styles.iconButton} accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={26} color={colors.mango} />
          </Pressable>
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.toggleWrap}>
          <Pulse active={available} />
          <Animated.View style={{ transform: [{ scale }] }}>
            <Pressable
              onPress={toggle}
              onPressIn={() => press(0.95)}
              onPressOut={() => press(1)}
              disabled={busy || !connected}
              accessibilityRole="radio"
              accessibilityState={{ checked: available, disabled: busy || !connected }}
              accessibilityLabel="I'm Available"
            >
              {available ? (
                <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.toggle}>
                  <Ionicons name="radio-button-on" size={40} color={colors.text} />
                  <Text style={[type.subheadline, { fontWeight: '700' }]}>I'm Available</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.toggle, styles.toggleOff]}>
                  <Ionicons name="radio-button-off" size={40} color={colors.mango} />
                  <Text style={[type.subheadline, { color: colors.mango }]}>I'm Available</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>
        </View>

        <Text style={[type.subheadline, { textAlign: 'center' }]}>
          {!connected ? 'Connecting…' : available ? 'Finding your match…' : "You're hidden"}
        </Text>
        <Caption center>
          {available
            ? "Your profile is visible to other available guys nearby. We'll show you the best match as soon as there is one."
            : 'Nobody can see your profile until you tap I’m Available.'}
        </Caption>
        <ErrorText>{error}</ErrorText>
      </View>

      {filled < 4 ? (
        <Pressable onPress={() => router.push('/profile')}>
          <Card style={{ marginHorizontal: space.pad, marginBottom: space.pad, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={type.button}>Finish your profile</Text>
              <Caption>Guys with photos and answers get better matches.</Caption>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mango} />
          </Card>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const SIZE = 200;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.pad,
    paddingVertical: 8,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.pad, padding: space.section },
  toggleWrap: { width: SIZE * 1.6, height: SIZE * 1.6, alignItems: 'center', justifyContent: 'center' },
  toggle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center', gap: 8 },
  toggleOff: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.blue },
  pulse: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3, borderColor: colors.mango },
});
