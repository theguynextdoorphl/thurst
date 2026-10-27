import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api } from '../../api';
import { Body, Button, Caption, Card, ErrorText, Field, H1, Screen } from '../../components/ui';

export default function RegisterVerify() {
  const params = useLocalSearchParams<{ email: string; devCode?: string }>();
  const email = params.email;
  // Set when the server has no email service (local development).
  const [devCode, setDevCode] = useState(params.devCode);
  const [code, setCode] = useState(params.devCode ?? '');
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
      const res = await api<{ devCode?: string }>('POST', '/auth/email/start', { email });
      setDevCode(res.devCode);
      if (res.devCode) setCode(res.devCode);
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
      {devCode ? (
        <Card>
          <Caption>Email isn't set up on this server yet, so here's your code. It's filled in for you.</Caption>
          <Body>{devCode}</Body>
        </Card>
      ) : null}
      {note ? <Body muted>{note}</Body> : null}
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
