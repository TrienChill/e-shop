import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Button, Text, View } from 'react-native';

export default function ProfileScreen() {
  const logout = async () => {
    // 1. Xóa dữ liệu phiên làm việc
    await AsyncStorage.removeItem('userToken');

    console.log('Đang đăng xuất...');
    // 2. Điều hướng người dùng về trang đăng nhập
    router.replace('./auth/login');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Profile Screen</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}