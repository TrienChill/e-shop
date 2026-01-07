import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AIChatScreen() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>AI Stylist Chat</Text>
    </SafeAreaView>
  );
}