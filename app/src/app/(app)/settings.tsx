import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { Body, Button, Caption, Card, ErrorText, H2, Screen, Sheet } from '../../components/ui';
import { useLive } from '../../live';
import { useMe, useSession } from '../../session';
import { colors, space, type } from '../../theme';

function Row({ icon, label, detail, href }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail?: string; href: Href }) {
  return (
    <Pressable style={styles.row} onPress={() => router.push(href)} accessibilityRole="button">
      <Ionicons name={icon} size={22} color={colors.mango} />
      <View style={{ flex: 1 }}>
        <Text style={type.body}>{label}</Text>
        {detail ? <Text style={type.caption}>{detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const GUIDELINES = [
  'You must be 18 or older.',
  'Use real, recent photos of yourself. No photos of other people, minors, or anything illegal.',
  'Be honest in your profile, especially about health.',
  'No means no, including “Not Right Now”. Respect it.',
  'No harassment, hate, threats, or sales of any kind.',
  'Meet safely: tell a friend where you are going.',
];

export default function Settings() {
  const me = useMe();
  const { signOut } = useSession();
  const { state, setAvailable } = useLive();
  const [help, setHelp] = useState(false);
  const [error, setError] = useState('');

  const leave = async () => {
    if (state.available) await setAvailable(false).catch(() => {});
    await signOut();
  };

  const deleteAccount = () => {
    const go = async () => {
      try {
        await api('DELETE', '/me');
        await signOut();
      } catch (e) {
        setError((e as Error).message);
      }
    };
    const msg = 'This permanently deletes your account, profile, photos and match history.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) go();
      return;
    }
    Alert.alert('Delete account?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <Screen>
      <Card>
        <H2>Account</H2>
        <Body>{me.username}</Body>
        <Caption>{me.email}</Caption>
      </Card>

      <Card style={{ gap: 0 }}>
        <Row icon="person-outline" label="Edit profile" href="/profile" />
        <Row icon="options-outline" label="Match filters" detail="Who we match you with" href="/filters" />
        <Row icon="location-outline" label="Home location" detail={[me.city, me.zip].filter(Boolean).join(' ')} href="/location" />
      </Card>

      <Card>
        <H2>Privacy</H2>
        <Caption>
          Your profile and photos are only visible while you're marked available, and photos only to your current match. Chat
          messages are never stored: they disappear when the 5 minutes are up. You can block or report anyone from a match.
        </Caption>
      </Card>

      <Card style={{ gap: 0 }}>
        <Pressable style={styles.row} onPress={() => setHelp(true)} accessibilityRole="button">
          <Ionicons name="help-circle-outline" size={22} color={colors.mango} />
          <Text style={[type.body, { flex: 1 }]}>Help & community guidelines</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </Card>

      <ErrorText>{error}</ErrorText>
      <Button title="Sign out" variant="secondary" onPress={leave} />
      <Button title="Delete account" variant="ghost" onPress={deleteAccount} />

      <Sheet visible={help} onClose={() => setHelp(false)} title="Community guidelines">
        <View style={{ gap: space.card, marginBottom: space.pad }}>
          {GUIDELINES.map((g) => (
            <Body key={g}>• {g}</Body>
          ))}
          <Caption>Report anyone who breaks these from the match or chat screen. We review every report.</Caption>
        </View>
        <Button title="Got it" onPress={() => setHelp(false)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.pad, minHeight: 56 },
});
