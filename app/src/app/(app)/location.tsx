import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import type { Me } from '@thurst/shared';
import { api } from '../../api';
import { Body, Button, Caption, Card, ErrorText, Field, H1, Screen } from '../../components/ui';
import { useMe, useSession } from '../../session';

export default function LocationSetup() {
  const me = useMe();
  const { setMe } = useSession();
  const [city, setCity] = useState(me.city ?? '');
  const [zip, setZip] = useState(me.zip ?? '');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const askPermission = async () => {
    const res = await Location.requestForegroundPermissionsAsync();
    setAllowed(res.status === 'granted');
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      setMe(await api<Me>('PUT', '/me/location', { city, zip }));
      router.replace(me.city ? '/settings' : '/profile');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title="Continue" onPress={submit} loading={busy} disabled={!city || zip.length < 3} />}>
      <H1>Where are you?</H1>
      <Field label="Home city" value={city} onChangeText={setCity} autoComplete="postal-address-locality" />
      <Field label="Zip / postal code" value={zip} onChangeText={setZip} autoCapitalize="characters" autoComplete="postal-code" />
      <Card>
        <Body>Location services</Body>
        <Caption>
          Thurst uses your location only while you're available, to find matches near you. Matches see a rounded distance,
          never your exact spot.
        </Caption>
        {allowed === true ? (
          <Body muted>Location is on.</Body>
        ) : (
          <Button title={allowed === false ? 'Try again' : 'Allow location'} variant="secondary" onPress={askPermission} />
        )}
        {allowed === false ? <Caption>Location is off. You can turn it on in your phone's Settings.</Caption> : null}
      </Card>
      <ErrorText>{error}</ErrorText>
    </Screen>
  );
}
