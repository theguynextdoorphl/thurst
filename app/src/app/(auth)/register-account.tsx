import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, type AuthResponse } from '../../api';
import { DateField } from '../../components/date-field';
import { Body, Button, Caption, ErrorText, Field, H1, Screen } from '../../components/ui';
import { useSession } from '../../session';
import { colors, type } from '../../theme';

const passwordChecks = (pw: string) => [
  { ok: pw.length >= 8, label: '8+ characters' },
  { ok: /[a-z]/.test(pw), label: 'lowercase' },
  { ok: /[A-Z]/.test(pw), label: 'uppercase' },
  { ok: /\d/.test(pw), label: 'number' },
];

const eighteenYearsAgo = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

export default function RegisterAccount() {
  const { registrationToken } = useLocalSearchParams<{ registrationToken: string }>();
  const { signIn } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [birthdate, setBirthdate] = useState<string>();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const checks = passwordChecks(password);
  const ready = username.length >= 3 && checks.every((c) => c.ok) && !!birthdate && acceptTerms;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api<AuthResponse>('POST', '/auth/register', {
        registrationToken,
        username,
        password,
        birthdate,
        acceptTerms,
      });
      // The auth layout sends us on once the session is set.
      await signIn(res.token, res.me);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Create account" onPress={submit} loading={busy} disabled={!ready} />}>
      <H1>Set up your account</H1>
      <Field
        label="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoComplete="username-new"
        hint="3 to 20 letters, numbers, dots or underscores. Shown to your matches."
      />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: -8 }}>
        {checks.map((c) => (
          <Text key={c.label} style={[type.caption, { color: c.ok ? colors.mango : colors.textMuted }]}>
            {c.ok ? '✓' : '○'} {c.label}
          </Text>
        ))}
      </View>
      <DateField
        label="Birthdate"
        value={birthdate}
        onChange={setBirthdate}
        maximumDate={eighteenYearsAgo()}
        initial={eighteenYearsAgo()}
      />
      <Caption>You must be 18 or older. Only your age is shown, never your birthdate.</Caption>
      <Pressable
        onPress={() => setAcceptTerms(!acceptTerms)}
        style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptTerms }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: acceptTerms ? colors.mango : colors.border,
            backgroundColor: acceptTerms ? colors.mango : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {acceptTerms ? <Text style={{ color: colors.bg, fontWeight: '700' }}>✓</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Body>I'm 18+ and agree to the Terms of Service and Community Guidelines.</Body>
        </View>
      </Pressable>
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
