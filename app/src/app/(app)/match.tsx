import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { REVIEW_SECONDS, type Decision } from '@thurst/shared';
import { ProfileView } from '../../components/profile-view';
import { SafetyMenu } from '../../components/safety-menu';
import { Body, Button, Center, ErrorText, Screen, TimerBar } from '../../components/ui';
import { useLive } from '../../live';
import { colors, space } from '../../theme';

export default function MatchReview() {
  const { state, decide } = useLive();
  const [busy, setBusy] = useState<Decision | null>(null);
  const [error, setError] = useState('');
  const m = state.match;

  if (!m || m.phase !== 'review') {
    return (
      <Center>
        <ActivityIndicator color={colors.mango} />
      </Center>
    );
  }

  const name = m.other.profile.displayName || m.other.username;
  const choose = async (d: Decision) => {
    setBusy(d);
    setError('');
    try {
      await decide(m.matchId, d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{ headerRight: () => <SafetyMenu userId={m.other.id} matchId={m.matchId} name={name} /> }}
      />
      <View style={{ paddingHorizontal: space.pad, paddingBottom: space.card, backgroundColor: colors.bg }}>
        <TimerBar endsAt={m.endsAt} total={REVIEW_SECONDS} urgentBelow={30} />
      </View>
      <Screen
        footer={
          m.myDecision === 'hook' ? (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 4 }}>
              <ActivityIndicator color={colors.mango} />
              <Body muted center>
                You're in. Waiting on {name}…
              </Body>
            </View>
          ) : (
            <>
              <ErrorText>{error}</ErrorText>
              <Button title="Hook Me Up" onPress={() => choose('hook')} loading={busy === 'hook'} disabled={!!busy} />
              <Button title="Not Right Now" variant="secondary" onPress={() => choose('pass')} loading={busy === 'pass'} disabled={!!busy} />
            </>
          )
        }
      >
        <ProfileView user={m.other} />
      </Screen>
    </>
  );
}
