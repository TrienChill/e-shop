import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(shop)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}