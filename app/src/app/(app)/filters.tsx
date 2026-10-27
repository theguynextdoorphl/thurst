import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import {
  BODY_TYPES, DISTANCE_UNITS, DRUG_USE, HIV_STATUSES, HOST_TRAVEL, LIKES, POSITIONS, YES_NO_SOCIALLY,
  type MatchPreferences, type Me,
} from '@thurst/shared';
import { api } from '../../api';
import { Body, Button, Caption, Card, Chips, ErrorText, Field, H2, Screen, Segmented } from '../../components/ui';
import { useMe, useSession } from '../../session';

const num = (s: string) => (s.trim() ? Number(s) : undefined);

export default function Filters() {
  const me = useMe();
  const { setMe } = useSession();
  const [f, setF] = useState<MatchPreferences>(me.preferences);
  const [distance, setDistance] = useState(me.preferences.distance ? String(me.preferences.distance) : '');
  const [ageMin, setAgeMin] = useState(me.preferences.ageMin ? String(me.preferences.ageMin) : '');
  const [ageMax, setAgeMax] = useState(me.preferences.ageMax ? String(me.preferences.ageMax) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof MatchPreferences>(key: K) => (value: MatchPreferences[K]) => setF((prev) => ({ ...prev, [key]: value }));
  const digits = (setter: (s: string) => void) => (t: string) => setter(t.replace(/\D/g, ''));

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      setMe(
        await api<Me>('PUT', '/me/preferences', { ...f, distance: num(distance), ageMin: num(ageMin), ageMax: num(ageMax) }),
      );
      router.back();
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
          <Button title="Save filters" onPress={save} loading={busy} />
        </>
      }
    >
      <Body muted>
        Tell us what you're after. Everything is optional: leave something blank and it won't rule anyone out. We only match you
        with guys whose filters fit you too.
      </Body>

      <Card>
        <H2>Distance & age</H2>
        <Field label="Search distance" value={distance} onChangeText={digits(setDistance)} keyboardType="number-pad" placeholder="25" />
        <Segmented options={DISTANCE_UNITS} value={f.distanceUnit ?? 'mi'} onChange={set('distanceUnit')} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Min age" value={ageMin} onChangeText={digits(setAgeMin)} keyboardType="number-pad" placeholder="18" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Max age" value={ageMax} onChangeText={digits(setAgeMax)} keyboardType="number-pad" placeholder="Any" />
          </View>
        </View>
      </Card>

      <Card>
        <H2>Him</H2>
        <Chips label="Body type" options={BODY_TYPES} value={f.bodyTypes} onChange={set('bodyTypes')} />
        <Chips label="Position" options={POSITIONS} value={f.positions} onChange={set('positions')} />
        <Chips label="Hosting or travelling" options={HOST_TRAVEL} value={f.hostTravel} onChange={set('hostTravel')} />
      </Card>

      <Card>
        <H2>Habits & health</H2>
        <Chips label="Smoker" options={YES_NO_SOCIALLY} value={f.smoker} onChange={set('smoker')} />
        <Chips label="Drinker" options={YES_NO_SOCIALLY} value={f.drinker} onChange={set('drinker')} />
        <Chips label="Drug use" options={DRUG_USE} value={f.drugUse} onChange={set('drugUse')} />
        <Chips label="HIV status I'm comfortable with" options={HIV_STATUSES} value={f.hivStatuses} onChange={set('hivStatuses')} />
      </Card>

      <Card>
        <H2>Must-haves</H2>
        <Caption>He has to be into all of these.</Caption>
        <Chips label="Likes" options={LIKES} value={f.mustHaveLikes} onChange={set('mustHaveLikes')} />
      </Card>
    </Screen>
  );
}
