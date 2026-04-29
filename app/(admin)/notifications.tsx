import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { ShoppingCart, CreditCard, Users, Settings, Bell, Search, Star, Download, RefreshCw, MoreVertical } from 'lucide-react-native';

interface NotificationItem {
  id: string;
  type: 'order' | 'payment' | 'user' | 'system' | 'review';
  title: string;
  message: string;
  time: string;
  isUnread: boolean;
  icon: any;
  color: string;
  bgColor: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const initialNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'order',
    title: 'Đơn hàng mới nhận được',
    message: `Emma Wilson đã đặt đơn hàng ORD-7891 trị giá ${formatCurrency(299000)}`,
    time: '2 phút trước',
    isUnread: true,
    icon: ShoppingCart,
    color: '#10B981', // green
    bgColor: '#D1FAE5'
  },
  {
    id: '2',
    type: 'payment',
    title: 'Thanh toán đã xử lý',
    message: `Đã xác nhận khoản thanh toán ${formatCurrency(1499000)} từ Sofia Garcia`,
    time: '15 phút trước',
    isUnread: true,
    icon: CreditCard,
    color: '#3B82F6', // blue
    bgColor: '#DBEAFE'
  },
  {
    id: '3',
    type: 'user',
    title: 'Đăng ký khách hàng mới',
    message: 'James Chen đã tạo một tài khoản mới',
    time: '1 giờ trước',
    isUnread: true,
    icon: Users,
    color: '#8B5CF6', // purple
    bgColor: '#EDE9FE'
  },
  {
    id: '4',
    type: 'order',
    title: 'Đơn hàng đã giao',
    message: 'Đơn hàng ORD-7889 đã được giao cho Sofia Garcia',
    time: '2 giờ trước',
    isUnread: false,
    icon: ShoppingCart,
    color: '#10B981',
    bgColor: '#D1FAE5'
  },
  {
    id: '5',
    type: 'system',
    title: 'Cập nhật hệ thống',
    message: 'Bảng điều khiển v2.1 đã được triển khai thành công',
    time: '3 giờ trước',
    isUnread: false,
    icon: Settings,
    color: '#6B7280', // gray
    bgColor: '#F3F4F6'
  },
  {
    id: '6',
    type: 'payment',
    title: 'Thanh toán thất bại',
    message: 'Lần thử thanh toán cho đơn hàng ORD-7888 từ Alex Thompson không thành công',
    time: '4 giờ trước',
    isUnread: false,
    icon: CreditCard,
    color: '#EF4444', // red
    bgColor: '#FEE2E2'
  },
  {
    id: '7',
    type: 'review',
    title: 'Đánh giá mới',
    message: 'Maria Santos đã để lại đánh giá 5 sao: "Sản phẩm tuyệt vời!"',
    time: '5 giờ trước',
    isUnread: false,
    icon: Star,
    color: '#F59E0B', // yellow
    bgColor: '#FEF3C7'
  },
  {
    id: '8',
    type: 'payment',
    title: 'Gia hạn gói đăng ký',
    message: 'Gói Nhóm (Team Plan) của James Chen đã được gia hạn thêm một tháng',
    time: '6 giờ trước',
    isUnread: false,
    icon: CreditCard,
    color: '#3B82F6',
    bgColor: '#DBEAFE'
  },
  {
    id: '9',
    type: 'system',
    title: 'Bảo trì máy chủ',
    message: 'Cửa sổ bảo trì định kỳ: Ngày 20 tháng 2, từ 2:00 sáng - 4:00 sáng (giờ UTC)',
    time: '1 ngày trước',
    isUnread: false,
    icon: Settings,
    color: '#6B7280',
    bgColor: '#F3F4F6'
  },
  {
    id: '10',
    type: 'order',
    title: 'Đơn hàng mới nhận được',
    message: `David Kim đã đặt đơn hàng ORD-7886 trị giá ${formatCurrency(599000)}`,
    time: '2 ngày trước',
    isUnread: false,
    icon: ShoppingCart,
    color: '#10B981',
    bgColor: '#D1FAE5'
  },
  {
    id: '11',
    type: 'system',
    title: 'Xuất dữ liệu hàng loạt hoàn tất',
    message: 'Dữ liệu khách hàng bạn yêu cầu xuất đã sẵn sàng để tải xuống',
    time: '2 ngày trước',
    isUnread: false,
    icon: Download,
    color: '#6B7280',
    bgColor: '#F3F4F6'
  },
  {
    id: '12',
    type: 'payment',
    title: 'Hoàn tiền đã xử lý',
    message: `Khoản hoàn tiền ${formatCurrency(599000)} đã được thực hiện cho đơn hàng ORD-7886`,
    time: '3 ngày trước',
    isUnread: false,
    icon: CreditCard,
    color: '#3B82F6',
    bgColor: '#DBEAFE'
  }
];

export default function NotificationsPage() {
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.isUnread;
    if (filter === 'read') return !n.isUnread;
    return true;
  });

  const unreadCount = notifications.filter(n => n.isUnread).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isUnread: false })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isUnread: false } : n));
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarLabel}>Hệ thống quản trị</Text>
          <Text style={styles.topBarTitle}>Quản lý Thông báo</Text>
        </View>
        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
          <RefreshCw size={16} color="#4B5563" style={{ marginRight: 6 }} />
          <Text style={styles.markAllText}>Đánh dấu đã đọc tất cả</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.cardTitle}>Tất cả thông báo</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount} chưa đọc</Text>
                </View>
              )}
            </View>

            <View style={styles.filterGroup}>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>Tất cả</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
                onPress={() => setFilter('unread')}
              >
                <Text style={[styles.filterButtonText, filter === 'unread' && styles.filterButtonTextActive]}>Chưa đọc</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, filter === 'read' && styles.filterButtonActive]}
                onPress={() => setFilter('read')}
              >
                <Text style={[styles.filterButtonText, filter === 'read' && styles.filterButtonTextActive]}>Đã đọc</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          <View style={styles.listContainer}>
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Bell size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Không có thông báo nào</Text>
              </View>
            ) : (
              filteredNotifications.map((item, index) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[
                      styles.notificationItem, 
                      item.isUnread && styles.notificationItemUnread,
                      index !== filteredNotifications.length - 1 && styles.borderBottom
                    ]}
                    onPress={() => markAsRead(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                      <Icon size={20} color={item.color} strokeWidth={2.5} />
                    </View>
                    
                    <View style={styles.contentContainer}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.itemTitle, item.isUnread && styles.itemTitleUnread]}>{item.title}</Text>
                        {item.isUnread && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.itemMessage}>{item.message}</Text>
                      <Text style={styles.itemTime}>{item.time}</Text>
                    </View>
                    
                    <TouchableOpacity style={styles.moreButton}>
                      <MoreVertical size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  topBar: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 50,
  },
  topBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    })
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  scrollContent: {
    padding: 24,
    maxWidth: 1000,
    marginHorizontal: 'auto',
    width: '100%',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexWrap: 'wrap',
    gap: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  filterGroup: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#111827',
  },
  listContainer: {
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    alignItems: 'flex-start',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  notificationItemUnread: {
    backgroundColor: '#F8FAFC',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  itemTitleUnread: {
    color: '#111827',
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  itemMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  itemTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  moreButton: {
    padding: 8,
    marginLeft: 8,
  }
});
