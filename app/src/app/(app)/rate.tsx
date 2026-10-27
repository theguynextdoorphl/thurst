import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api';
import { Body, Button, Caption, Card, Center, ErrorText, Field, H1, Screen, Segmented } from '../../components/ui';
import { useLive } from '../../live';
import { colors, space, type } from '../../theme';

const LABELS = ['', 'Poor experience', 'Below expectations', 'Average experience', 'Good experience', 'Excellent experience'];

export default function Rate() {
  const { state } = useLive();
  const pending = state.pendingRating;
  const [stars, setStars] = useState(0);
  const [again, setAgain] = useState<'Yes' | 'No' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent || !pending) {
    return (
      <Center>
        <Ionicons name="checkmark-circle" size={64} color={colors.mango} />
        <H1>Thanks!</H1>
        <Body muted center>
          Your rating helps us find you better matches.
        </Body>
        <Button title="Back home" onPress={() => router.replace('/home')} style={{ alignSelf: 'stretch' }} />
      </Center>
    );
  }

  const name = pending.other.profile.displayName || pending.other.username;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api('POST', `/matches/${pending.matchId}/rating`, {
        stars,
        matchAgain: again === 'Yes',
        feedback: feedback.trim() || undefined,
      });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <ErrorText>{error}</ErrorText>
          <Button title="Submit rating" onPress={submit} loading={busy} disabled={!stars || !again} />
        </>
      }
    >
      <Body muted>Time's up. How was it with {name}?</Body>

      <Card style={{ alignItems: 'center' }}>
        <Text style={type.label}>Overall satisfaction</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setStars(n)} hitSlop={4} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
              <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={40} color={n <= stars ? colors.mango : colors.border} />
            </Pressable>
          ))}
        </View>
        <Caption>{LABELS[stars] || 'Tap a star'}</Caption>
      </Card>

      <Card>
        <Text style={type.label}>Would you match with him again?</Text>
        <Segmented options={['Yes', 'No'] as const} value={again ?? ('' as 'Yes')} onChange={setAgain} />
        {again === 'No' ? <Caption>We won't pair you two again.</Caption> : null}
      </Card>

      <Field label="Anything else? (optional)" value={feedback} onChangeText={setFeedback} multiline maxLength={500} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', gap: space.card, marginVertical: 4 },
});
