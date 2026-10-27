import { router } from 'expo-router';
import { ProfileView } from '../../components/profile-view';
import { Button, Caption, Screen } from '../../components/ui';
import { useMe } from '../../session';

export default function MyProfile() {
  const me = useMe();
  return (
    <Screen footer={<Button title="Edit profile" onPress={() => router.push('/profile')} />}>
      <Caption center>This is what your match sees during the 2 minute review.</Caption>
      <ProfileView user={{ id: me.id, username: me.username, age: me.age, distanceMiles: null, profile: me.profile, photos: me.photos }} />
    </Screen>
  );
}
