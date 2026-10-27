import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import {
  BODY_HAIR, BODY_TYPES, COCK_SIZES, DRUG_USE, ETHNICITIES, GIRTHS, HIV_STATUSES, HOST_TRAVEL, LIKES,
  POSITIONS, RELATIONSHIP_STATUSES, SAFER_SEX, VACCINATIONS, WEIGHT_UNITS, YES_NO_SOCIALLY,
  type Me, type Profile,
} from '@thurst/shared';
import { api } from '../../api';
import { DateField } from '../../components/date-field';
import { PhotoManager } from '../../components/photo-manager';
import { daysAgo } from '../../components/profile-view';
import { Body, Button, Caption, Card, Chips, ErrorText, Field, H2, Screen, Segmented, Select } from '../../components/ui';
import { useMe, useSession } from '../../session';
import { space } from '../../theme';

export default function EditProfile() {
  const me = useMe();
  const { setMe } = useSession();
  const [p, setP] = useState<Profile>(me.profile);
  const [weight, setWeight] = useState(me.profile.weight ? String(me.profile.weight) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Profile>(key: K) => (value: Profile[K]) => setP((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const w = weight.trim() ? Number(weight) : undefined;
      if (w !== undefined && !(w > 0)) throw new Error('Weight must be a number');
      setMe(await api<Me>('PUT', '/me/profile', { ...p, weight: w }));
      if (router.canGoBack()) router.back();
      else router.replace('/home');
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
          <Button title="Save profile" onPress={save} loading={busy} />
        </>
      }
    >
      <Card>
        <H2>Photos</H2>
        <PhotoManager />
      </Card>

      <Card>
        <H2>About you</H2>
        <Field label="Display name" value={p.displayName ?? ''} onChangeText={set('displayName')} placeholder={me.username} maxLength={30} />
        <Field label="A line about you" value={p.about ?? ''} onChangeText={set('about')} multiline maxLength={300} placeholder="Optional" />
      </Card>

      <Card>
        <H2>Basic information</H2>
        <View style={{ gap: 6 }}>
          <Caption>Age</Caption>
          <Body>{me.age} (from your birthdate)</Body>
        </View>
        <Field label="Weight (optional)" value={weight} onChangeText={(t) => setWeight(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" />
        <Segmented options={WEIGHT_UNITS} value={p.weightUnit ?? 'lbs'} onChange={set('weightUnit')} />
        <Chips label="Ethnicity" options={ETHNICITIES} value={p.ethnicity} onChange={set('ethnicity')} />
        <Select label="Relationship status" options={RELATIONSHIP_STATUSES} value={p.relationshipStatus} onChange={set('relationshipStatus')} />
        <Select label="Smoker" options={YES_NO_SOCIALLY} value={p.smoker} onChange={set('smoker')} />
        <Select label="Drinker" options={YES_NO_SOCIALLY} value={p.drinker} onChange={set('drinker')} />
        <Select label="Drug use" options={DRUG_USE} value={p.drugUse} onChange={set('drugUse')} />
        <Select label="Body type" options={BODY_TYPES} value={p.bodyType} onChange={set('bodyType')} />
        <Select label="Body hair" options={BODY_HAIR} value={p.bodyHair} onChange={set('bodyHair')} />
      </Card>

      <Card>
        <H2>Health & wellness</H2>
        <Select label="HIV status" options={HIV_STATUSES} value={p.hivStatus} onChange={set('hivStatus')} />
        <DateField label="Last tested (optional)" value={p.lastTested} onChange={set('lastTested')} maximumDate={new Date()} clearable />
        {p.lastTested ? <Caption>Shown as “{daysAgo(p.lastTested)}”</Caption> : null}
        <Chips label="Vaccinations" options={VACCINATIONS} value={p.vaccinations} onChange={set('vaccinations')} />
        <Field label="Other vaccinations" value={p.vaccinationsOther ?? ''} onChangeText={set('vaccinationsOther')} maxLength={60} />
      </Card>

      <Card>
        <H2>The good stuff</H2>
        <Select label="Cock size" options={COCK_SIZES} value={p.cockSize} onChange={set('cockSize')} />
        <Select label="Girth" options={GIRTHS} value={p.girth} onChange={set('girth')} />
        <Select label="Position" options={POSITIONS} value={p.position} onChange={set('position')} />
        <Select label="You prefer to fuck" options={SAFER_SEX} value={p.saferSex} onChange={set('saferSex')} />
        <Chips label="Likes" options={LIKES} value={p.likes} onChange={set('likes')} />
        <Select label="Prefer to" options={HOST_TRAVEL} value={p.hostTravel} onChange={set('hostTravel')} />
      </Card>

      <View style={{ height: space.pad }} />
    </Screen>
  );
}
