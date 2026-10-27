import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { Photo, PublicProfile } from '@thurst/shared';
import { API_URL, authHeaders } from '../api';
import { colors, space, type } from '../theme';
import { Card, H2 } from './ui';

export function AuthImage({ photo, size, style }: { photo: Photo; size: number; style?: object }) {
  return (
    <Image
      source={{ uri: API_URL + photo.url, headers: authHeaders() }}
      style={[{ width: size, height: size, borderRadius: space.radius, backgroundColor: colors.surfaceRaised }, style]}
      contentFit="cover"
      cachePolicy="none"
    />
  );
}

export function daysAgo(date: string): string {
  const days = Math.floor((Date.now() - new Date(`${date}T00:00:00`).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={styles.row}>
      <Text style={type.caption}>{label}</Text>
      <Text style={[type.body, { flexShrink: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

const join = (v?: string[]) => (v?.length ? v.join(', ') : undefined);

/** The complete profile shown to a match during review. */
export function ProfileView({ user }: { user: PublicProfile }) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const p = user.profile;
  const photoSize = Math.min(width, 600) - space.pad * 2;
  const vaccines = [...(p.vaccinations ?? []), ...(p.vaccinationsOther ? [p.vaccinationsOther] : [])];

  return (
    <View style={{ gap: space.pad }}>
      {user.photos.length ? (
        <View>
          <FlatList
            data={user.photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(ph) => ph.id}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / photoSize))}
            renderItem={({ item }) => <AuthImage photo={item} size={photoSize} />}
          />
          {user.photos.length > 1 ? (
            <View style={styles.dots}>
              {user.photos.map((ph, i) => (
                <View key={ph.id} style={[styles.dot, i === page && { backgroundColor: colors.mango }]} />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={[styles.noPhoto, { height: photoSize * 0.6 }]}>
          <Text style={type.caption}>No photos</Text>
        </View>
      )}

      <View>
        <Text style={type.headline}>
          {p.displayName || user.username}, {user.age}
        </Text>
        <Text style={type.caption}>
          {user.distanceMiles !== null ? `About ${user.distanceMiles} mi away` : 'Nearby'}
        </Text>
        {p.about ? <Text style={[type.body, { marginTop: space.card }]}>{p.about}</Text> : null}
      </View>

      <Card>
        <H2>Basics</H2>
        <Row label="Weight" value={p.weight ? `${p.weight} ${p.weightUnit ?? 'lbs'}` : undefined} />
        <Row label="Ethnicity" value={join(p.ethnicity)} />
        <Row label="Relationship" value={p.relationshipStatus} />
        <Row label="Body type" value={p.bodyType} />
        <Row label="Body hair" value={p.bodyHair} />
        <Row label="Smoker" value={p.smoker} />
        <Row label="Drinker" value={p.drinker} />
        <Row label="Drug use" value={p.drugUse} />
      </Card>

      <Card>
        <H2>Health & wellness</H2>
        <Row label="HIV status" value={p.hivStatus} />
        <Row label="Last tested" value={p.lastTested ? daysAgo(p.lastTested) : undefined} />
        <Row label="Vaccinations" value={join(vaccines)} />
      </Card>

      <Card>
        <H2>The good stuff</H2>
        <Row label="Size" value={p.cockSize} />
        <Row label="Girth" value={p.girth} />
        <Row label="Position" value={p.position} />
        <Row label="Prefers to fuck" value={p.saferSex} />
        <Row label="Prefers to" value={p.hostTravel} />
        {p.likes?.length ? (
          <View style={styles.likes}>
            {p.likes.map((l) => (
              <View key={l} style={styles.like}>
                <Text style={[type.caption, { color: colors.mango }]}>{l}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.pad, minHeight: 28 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  noPhoto: { borderRadius: space.radius, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  likes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  like: { borderWidth: 1, borderColor: colors.mango, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
});
