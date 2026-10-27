import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '../../api';
import { Body, Button, ErrorText, Field, H1, Screen } from '../../components/ui';

export default function RegisterEmail() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await api('POST', '/auth/email/start', { email });
      router.push({ pathname: '/register-verify', params: { email: email.trim().toLowerCase() } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Send code" onPress={submit} loading={busy} disabled={!email.includes('@')} />}>
      <H1>What's your email?</H1>
      <Body muted>We'll send you a code to verify it. Your email is never shown to anyone.</Body>
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        onSubmitEditing={submit}
      />
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
