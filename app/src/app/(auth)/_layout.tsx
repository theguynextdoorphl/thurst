import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../session';
import { colors, motion } from '../../theme';

export default function AuthLayout() {
  const { token } = useSession();
  if (token) return <Redirect href="/" />;
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
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Sign in' }} />
      <Stack.Screen name="register-email" options={{ title: 'Step 1 of 3' }} />
      <Stack.Screen name="register-verify" options={{ title: 'Step 1 of 3' }} />
      <Stack.Screen name="register-account" options={{ title: 'Step 2 of 3' }} />
    </Stack>
  );
}
