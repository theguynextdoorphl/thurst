import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text,
  TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CHAT_SECONDS, type ChatMessage } from '@thurst/shared';
import { SafetyMenu } from '../../components/safety-menu';
import { Center, ErrorText, TimerBar } from '../../components/ui';
import { currentCoords, useLive } from '../../live';
import { useMe } from '../../session';
import { colors, motion, space, type } from '../../theme';

function mapsUrl(lat: number, lng: number) {
  return Platform.OS === 'ios' ? `http://maps.apple.com/?ll=${lat},${lng}&q=Here` : `https://maps.google.com/?q=${lat},${lng}`;
}

function Bubble({ msg, mine }: { msg: ChatMessage; mine: boolean }) {
  const style = [styles.bubble, mine ? styles.mine : styles.theirs];
  if (msg.kind === 'location') {
    const { lat, lng } = JSON.parse(msg.body) as { lat: number; lng: number };
    return (
      <Pressable style={style} onPress={() => Linking.openURL(mapsUrl(lat, lng))} accessibilityRole="link">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="location" size={18} color={mine ? colors.bg : colors.mango} />
          <Text style={[type.body, mine && { color: colors.bg }, { fontWeight: '500' }]}>Shared location</Text>
        </View>
        <Text style={[type.caption, mine && { color: colors.bg }]}>Tap to open in Maps</Text>
      </Pressable>
    );
  }
  return (
    <View style={style}>
      <Text style={[type.body, mine && { color: colors.bg }]}>{msg.body}</Text>
    </View>
  );
}

/** Slides down from the top when the one-minute warning arrives. */
function WarningBanner({ text }: { text: string | null }) {
  const y = useRef(new Animated.Value(-80)).current;
  useEffect(() => {
    if (!text) return;
    Animated.sequence([
      Animated.timing(y, { toValue: 0, duration: motion.card, useNativeDriver: true }),
      Animated.delay(4000),
      Animated.timing(y, { toValue: -80, duration: motion.card, useNativeDriver: true }),
    ]).start();
  }, [text, y]);
  if (!text) return null;
  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: y }] }]} pointerEvents="none">
      <Ionicons name="time-outline" size={20} color={colors.text} />
      <Text style={[type.button, { flex: 1 }]}>{text}</Text>
    </Animated.View>
  );
}

export default function Chat() {
  const me = useMe();
  const { state, warning, sendText, sendLocation } = useLive();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const list = useRef<FlatList<ChatMessage>>(null);
  const m = state.match;

  if (!m || m.phase !== 'chat') {
    return (
      <Center>
        <ActivityIndicator color={colors.mango} />
      </Center>
    );
  }

  const name = m.other.profile.displayName || m.other.username;

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setError('');
    setText('');
    try {
      await sendText(m.matchId, body);
    } catch (e) {
      setText(body);
      setError((e as Error).message);
    }
  };

  const share = async () => {
    setSharing(true);
    setError('');
    try {
      await sendLocation(m.matchId, await currentCoords());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: name,
          headerRight: () => <SafetyMenu userId={m.other.id} matchId={m.matchId} name={name} />,
        }}
      />
      <View style={{ paddingHorizontal: space.pad, paddingBottom: space.card }}>
        <TimerBar endsAt={m.endsAt} total={CHAT_SECONDS} urgentBelow={60} />
      </View>
      <WarningBanner text={warning?.matchId === m.matchId ? warning.message : null} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
        <FlatList
          ref={list}
          data={m.messages}
          keyExtractor={(msg) => msg.id}
          contentContainerStyle={{ padding: space.pad, gap: 8, flexGrow: 1 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Text style={[type.caption, { textAlign: 'center', marginTop: space.section }]}>
              You both said Hook Me Up. You have 5 minutes to sort out where and when. No extensions.
            </Text>
          }
          renderItem={({ item }) => <Bubble msg={item} mine={item.senderId === me.id} />}
        />
        <View style={{ paddingHorizontal: space.pad }}>
          <ErrorText>{error}</ErrorText>
        </View>
        <View style={styles.composer}>
          <Pressable onPress={share} disabled={sharing} style={styles.iconButton} accessibilityLabel="Share my location">
            {sharing ? <ActivityIndicator color={colors.mango} /> : <Ionicons name="location-outline" size={24} color={colors.mango} />}
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor="#6B6B6B"
            style={styles.input}
            onSubmitEditing={send}
            returnKeyType="send"
            maxLength={1000}
          />
          <Pressable onPress={send} disabled={!text.trim()} style={styles.iconButton} accessibilityLabel="Send">
            <Ionicons name="send" size={22} color={text.trim() ? colors.mango : colors.border} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, gap: 2 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.mango, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: space.pad,
    color: colors.text,
    fontSize: 16,
  },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  banner: {
    position: 'absolute',
    top: 70,
    left: space.pad,
    right: space.pad,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.red,
    borderRadius: space.radius,
    padding: space.card,
  },
});
