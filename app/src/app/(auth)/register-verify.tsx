import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api } from '../../api';
import { Body, Button, ErrorText, Field, H1, Screen } from '../../components/ui';

export default function RegisterVerify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const { registrationToken } = await api<{ registrationToken: string }>('POST', '/auth/email/verify', { email, code });
      router.replace({ pathname: '/register-account', params: { registrationToken } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      await api('POST', '/auth/email/start', { email });
      setNote('We sent a new code.');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button title="Verify" onPress={submit} loading={busy} disabled={code.length !== 6} />
          <Button title="Send a new code" variant="ghost" onPress={resend} />
        </>
      }
    >
      <H1>Check your email</H1>
      <Body muted>Enter the 6 digit code we sent to {email}.</Body>
      <Field
        label="Code"
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        onSubmitEditing={submit}
      />
      {note ? <Body muted>{note}</Body> : null}
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
