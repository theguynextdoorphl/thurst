import { useState } from 'react';
import { api, type AuthResponse } from '../../api';
import { Button, ErrorText, Field, H1, Screen } from '../../components/ui';
import { useSession } from '../../session';

export default function Login() {
  const { signIn } = useSession();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api<AuthResponse>('POST', '/auth/login', { login, password });
      // The auth layout sends us on once the session is set.
      await signIn(res.token, res.me);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Sign in" onPress={submit} loading={busy} disabled={!login || !password} />}>
      <H1>Welcome back</H1>
      <Field label="Username or email" value={login} onChangeText={setLogin} autoCapitalize="none" autoComplete="username" />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        onSubmitEditing={submit}
      />
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
