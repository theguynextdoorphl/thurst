import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Caption, Screen } from '../../components/ui';
import { colors, gradient, space, type } from '../../theme';

export default function Welcome() {
  return (
    <Screen
      scroll={false}
      style={{ justifyContent: 'center' }}
      footer={
        <>
          <Button title="Create account" onPress={() => router.push('/register-email')} />
          <Button title="Sign in" variant="secondary" onPress={() => router.push('/login')} />
          <Caption center>Thurst is for adults 18 and over.</Caption>
        </>
      }
    >
      <View style={styles.hero}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mark}>
          <Text style={styles.markText}>T</Text>
        </LinearGradient>
        <Text style={[type.headline, { fontSize: 40, letterSpacing: 1 }]}>Thurst</Text>
        <Text style={[type.subheadline, { color: colors.mango }]}>Right Now. Right Here.</Text>
        <Text style={[type.body, { color: colors.textMuted, textAlign: 'center', marginTop: space.card }]}>
          Get matched with someone nearby, decide in two minutes, and sort it out in five. No endless chatting.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.card, paddingHorizontal: space.pad },
  mark: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: space.pad },
  markText: { color: colors.text, fontSize: 56, fontWeight: '700' },
});
