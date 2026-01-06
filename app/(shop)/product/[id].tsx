import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Product Detail: {id}</Text>
    </View>
  );
}