import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MAX_PHOTOS, type Me } from '@thurst/shared';
import { api } from '../api';
import { useMe, useSession } from '../session';
import { colors, space, type } from '../theme';
import { AuthImage } from './profile-view';
import { Caption, ErrorText } from './ui';

const SIZE = 100;

async function toFormData(asset: ImagePicker.ImagePickerAsset): Promise<FormData> {
  const form = new FormData();
  const mime = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  if (Platform.OS === 'web') {
    form.append('photo', await (await fetch(asset.uri)).blob(), 'photo');
  } else {
    // React Native's FormData takes a file descriptor object.
    form.append('photo', { uri: asset.uri, name: mime === 'image/png' ? 'photo.png' : 'photo.jpg', type: mime } as never);
  }
  return form;
}

/** Up to five photos: add, remove, and move left or right to reorder. */
export function PhotoManager() {
  const me = useMe();
  const { setMe } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<Me>) => {
    setBusy(true);
    setError('');
    try {
      setMe(await fn());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7, // compresses before upload
    });
    if (res.canceled || !res.assets[0]) return;
    const form = await toFormData(res.assets[0]);
    await run(() => api<Me>('POST', '/me/photos', form));
  };

  const move = (index: number, by: number) => {
    const ids = me.photos.map((p) => p.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + by, 0, id!);
    return run(() => api<Me>('PUT', '/me/photos/order', { ids }));
  };

  return (
    <View style={{ gap: space.card }}>
      <View style={styles.grid}>
        {me.photos.map((p, i) => (
          <View key={p.id} style={styles.slot}>
            <AuthImage photo={p} size={SIZE} />
            {i === 0 ? (
              <View style={styles.badge}>
                <Text style={[type.caption, { color: colors.bg, fontWeight: '700' }]}>Main</Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <Pressable disabled={busy || i === 0} onPress={() => move(i, -1)} hitSlop={8} accessibilityLabel="Move left">
                <Ionicons name="chevron-back" size={18} color={i === 0 ? colors.border : colors.text} />
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => run(() => api<Me>('DELETE', `/me/photos/${p.id}`))}
                hitSlop={8}
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="trash-outline" size={18} color={colors.text} />
              </Pressable>
              <Pressable
                disabled={busy || i === me.photos.length - 1}
                onPress={() => move(i, 1)}
                hitSlop={8}
                accessibilityLabel="Move right"
              >
                <Ionicons name="chevron-forward" size={18} color={i === me.photos.length - 1 ? colors.border : colors.text} />
              </Pressable>
            </View>
          </View>
        ))}
        {me.photos.length < MAX_PHOTOS ? (
          <Pressable style={[styles.slot, styles.add]} onPress={add} disabled={busy} accessibilityLabel="Add photo">
            {busy ? <ActivityIndicator color={colors.mango} /> : <Ionicons name="add" size={32} color={colors.mango} />}
          </Pressable>
        ) : null}
      </View>
      <Caption>
        Up to {MAX_PHOTOS} clear, recent photos. Only your match can see them, and only while you're available.
      </Caption>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.card },
  slot: { width: SIZE, height: SIZE, borderRadius: space.radius, overflow: 'hidden' },
  add: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.mango,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: colors.mango,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});
