import CartProvider from '@/src/context/CartContext';
import { Stack } from 'expo-router';

export default function ShopLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen 
  name="collection/[id]" 
  options={{ headerTitle: 'Collection', headerShown: false }} 
/>
      </Stack>

    </CartProvider>
  );
}
