import { Redirect, Stack, router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useLive } from '../../live';
import { useSession } from '../../session';
import { colors, motion } from '../../theme';

/** The match lifecycle is driven by the server; keep the screen in step with it. */
function useFollowMatch() {
  const { state } = useLive();
  const path = usePathname();
  const phase = state.match?.phase;
  const rating = state.pendingRating?.matchId;

  useEffect(() => {
    const target = phase === 'review' ? '/match' : phase === 'chat' ? '/chat' : rating ? '/rate' : null;
    if (target && path !== target) router.replace(target);
    // A review or chat that ended with nothing to rate goes back home. The rating
    // screen sends you home itself after its thank-you.
    if (!target && (path === '/match' || path === '/chat')) router.replace('/home');
  }, [phase, rating, path]);
}

export default function AppLayout() {
  const { token, me } = useSession();
  useFollowMatch();
  if (!token || !me) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.mango,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
        animationDuration: motion.page,
      }}
    >
      <Stack.Screen name="location" options={{ title: 'Step 3 of 3' }} />
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'Edit profile' }} />
      <Stack.Screen name="me" options={{ title: 'My profile' }} />
      <Stack.Screen name="filters" options={{ title: 'Match filters' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="match" options={{ title: "It's a match", headerBackVisible: false, gestureEnabled: false, animation: 'fade_from_bottom' }} />
      <Stack.Screen name="chat" options={{ title: 'Chat', headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="rate" options={{ title: 'How did it go?', headerBackVisible: false, gestureEnabled: false, presentation: 'modal' }} />
    </Stack>
  );
}
