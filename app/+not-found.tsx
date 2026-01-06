import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <Text>This screen doesn't exist.</Text>
      <Link href="/" style={{ marginTop: 15, paddingVertical: 15 }}>
        <Text style={{ color: 'blue' }}>Go to home screen!</Text>
      </Link>
    </View>
  );
}