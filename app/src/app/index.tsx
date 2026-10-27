import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Body, Button, Center, ErrorText } from '../components/ui';
import { useSession } from '../session';
import { colors } from '../theme';

export default function Gate() {
  const { ready, token, me, reload, signOut } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!ready) {
    return (
      <Center>
        <ActivityIndicator color={colors.mango} />
      </Center>
    );
  }
  if (!token) return <Redirect href="/welcome" />;
  if (!me) {
    return (
      <Center>
        <Body center>Can't reach Thurst right now.</Body>
        <ErrorText>{error}</ErrorText>
        <Button
          title="Try again"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await reload();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          style={{ alignSelf: 'stretch' }}
        />
        <Button title="Sign out" variant="ghost" onPress={signOut} style={{ alignSelf: 'stretch' }} />
      </Center>
    );
  }
  return <Redirect href={me.city ? '/home' : '/location'} />;
}
