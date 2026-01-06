// app/(admin)/_layout.tsx
import { Slot } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

export default function AdminLayout() {
  // Nếu là Mobile mà lỡ vào route admin -> Hiển thị dạng Stack bình thường
  if (Platform.OS !== 'web') {
    return <Slot />;
  }

  // Giao diện Admin Dashboard trên Web
  return (
    <View style={styles.container}>
      {/* SIDEBAR BÊN TRÁI */}
      <View style={styles.sidebar}>
        <Text style={styles.menuItem}>Dashboard</Text>
        <Text style={styles.menuItem}>Sản phẩm</Text>
        <Text style={styles.menuItem}>Đơn hàng</Text>
      </View>

      {/* NỘI DUNG CHÍNH BÊN PHẢI */}
      <View style={styles.content}>
        <Slot /> {/* Các màn hình con (dashboard, products...) sẽ hiện ở đây */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', height: '100%' },
  sidebar: { width: 250, backgroundColor: '#1A1A1A', padding: 20 },
  content: { flex: 1, backgroundColor: '#F9F9F9', padding: 20 },
  menuItem: { color: 'white', marginBottom: 20, fontSize: 16, fontWeight: 'bold' }
});