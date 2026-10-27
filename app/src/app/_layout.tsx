import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LiveProvider } from '../live';
import { SessionProvider } from '../session';
import { colors, motion } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <SessionProvider>
        <LiveProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.mango,
              headerTitleStyle: { color: colors.text },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'slide_from_right',
              animationDuration: motion.page,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
        </LiveProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
