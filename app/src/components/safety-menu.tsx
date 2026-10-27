import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../api';
import { colors, space } from '../theme';
import { Body, Button, Caption, ErrorText, Field, Sheet } from './ui';

const REASONS = [
  { id: 'fake', label: 'Fake profile or photos' },
  { id: 'underage', label: 'Looks under 18' },
  { id: 'harassment', label: 'Harassment or threats' },
  { id: 'inappropriate_photos', label: 'Inappropriate photos' },
  { id: 'safety', label: 'Safety concern' },
  { id: 'other', label: 'Something else' },
] as const;

/** Header button that opens block and report options for the current match. */
export function SafetyMenu({ userId, matchId, name }: { userId: string; matchId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]['id'] | null>(null);
  const [details, setDetails] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      setDone(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setOpen(false);
    setReason(null);
    setDetails('');
    setDone('');
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={10} accessibilityLabel="Block or report" style={{ padding: 6 }}>
        <Ionicons name="shield-outline" size={22} color={colors.mango} />
      </Pressable>
      <Sheet visible={open} onClose={close} title={done ? 'Thanks' : `Block or report ${name}`}>
        <View style={{ gap: space.card }}>
          {done ? (
            <>
              <Body>{done}</Body>
              <Button title="Close" onPress={close} />
            </>
          ) : reason ? (
            <>
              <Field label="Anything we should know? (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
              <ErrorText>{error}</ErrorText>
              <Button
                title="Send report"
                variant="danger"
                loading={busy}
                onPress={() =>
                  act(
                    () => api('POST', `/users/${userId}/report`, { reason, details: details || undefined, matchId }),
                    "We got your report and will review it. You won't be matched with him again if you also block him.",
                  )
                }
              />
            </>
          ) : (
            <>
              <Button
                title={`Block ${name}`}
                variant="danger"
                loading={busy}
                onPress={() =>
                  act(() => api('POST', `/users/${userId}/block`), "Blocked. This match is over and you won't see him again.")
                }
              />
              <Caption>Or report him for:</Caption>
              {REASONS.map((r) => (
                <Button key={r.id} title={r.label} variant="ghost" onPress={() => setReason(r.id)} />
              ))}
            </>
          )}
        </View>
      </Sheet>
    </>
  );
}
