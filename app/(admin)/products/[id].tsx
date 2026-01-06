import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function AdminProductDetail() {
  const { id } = useLocalSearchParams();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Admin Product Edit: {id}</Text>
    </View>
  );
}