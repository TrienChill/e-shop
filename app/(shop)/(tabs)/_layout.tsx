import { Tabs } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#6467f2' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Icon name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => <Icon name="cart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Icon name="account" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}