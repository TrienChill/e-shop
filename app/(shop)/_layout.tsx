import { Stack } from 'expo-router';
import { useWebUI } from '@/src/context/WebUIContext';
import WebDrawer from '@/src/components/web/WebDrawer';
import { View, Text } from 'react-native';
import CartContent from '@/src/features/cart/components/CartContent';
import { ChatButton } from '@/src/components/Chat/ChatButton';

export default function ShopLayout() {
  const { isCartDrawerOpen, closeCartDrawer } = useWebUI();

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="try-on" />
      </Stack>

      {/* Global Web Drawers */}
      <WebDrawer
        isVisible={isCartDrawerOpen}
        onClose={closeCartDrawer}
        width={420}
        title="Giỏ hàng của bạn"
      >
        <CartContent />
      </WebDrawer>

      {/* AI Chatbox Floating Button */}
      <ChatButton />
    </>
  );
}
