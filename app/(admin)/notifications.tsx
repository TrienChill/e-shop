import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { ShoppingCart, CreditCard, Users, Settings, Bell, Search, Star, Download, RefreshCw, MoreVertical } from 'lucide-react-native';
import { AdminDataWrapper } from "@/src/components/admin/AdminDataWrapper";
import { supabase } from '@/src/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface NotificationItem {
  id: string;
  type: 'order' | 'payment' | 'customer' | 'system' | 'review' | 'user';
  title: string;
  message: string;
  time: string;
  isUnread: boolean;
  icon: any;
  color: string;
  bgColor: string;
  created_at?: string;
}

const getNotificationStyle = (type: string) => {
  switch (type) {
    case 'order':
      return { icon: ShoppingCart, color: '#10B981', bgColor: '#D1FAE5' };
    case 'payment':
      return { icon: CreditCard, color: '#3B82F6', bgColor: '#DBEAFE' };
    case 'customer':
    case 'user':
      return { icon: Users, color: '#8B5CF6', bgColor: '#EDE9FE' };
    case 'review':
      return { icon: Star, color: '#F59E0B', bgColor: '#FEF3C7' };
    case 'system':
    default:
      return { icon: Settings, color: '#6B7280', bgColor: '#F3F4F6' };
  }
};

export default function NotificationsPage() {
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newRow = payload.new;
          const style = getNotificationStyle(newRow.type);
          const newNotif: NotificationItem = {
            id: newRow.id,
            type: newRow.type as any,
            title: newRow.title,
            message: newRow.content,
            time: formatDistanceToNow(new Date(newRow.created_at), { addSuffix: true, locale: vi }),
            isUnread: !newRow.is_read,
            icon: style.icon,
            color: style.color,
            bgColor: style.bgColor,
            created_at: newRow.created_at
          };
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      if (data) {
        const formatted = data.map((item: any) => {
          const style = getNotificationStyle(item.type);
          return {
            id: item.id,
            type: item.type,
            title: item.title,
            message: item.content,
            time: formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: vi }),
            isUnread: !item.is_read,
            icon: style.icon,
            color: style.color,
            bgColor: style.bgColor,
            created_at: item.created_at
          };
        });
        setNotifications(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isUnread: false }))
      );
    } catch (error) {
      console.error("Error updating all notifications:", error);
    }
  };

  const markAsRead = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif || !notif.isUnread) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n))
      );
    } catch (error) {
      console.error("Error updating notification:", error);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return n.isUnread;
    if (filter === 'read') return !n.isUnread;
    return true;
  });

  const unreadCount = notifications.filter(n => n.isUnread).length;

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
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.emptyText}>Đang tải thông báo...</Text>
              </View>
            ) : filteredNotifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Bell size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Không có thông báo nào</Text>
              </View>
            ) : (
              filteredNotifications.map((item, index) => {
                const Icon = item.icon;
                return (
                  <AdminDataWrapper 
                    key={item.id} 
                    style={[
                      styles.notificationItem, 
                      item.isUnread && styles.notificationItemUnread,
                      index !== filteredNotifications.length - 1 && styles.borderBottom
                    ]}
                    onPress={() => markAsRead(item.id)}
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
                  </AdminDataWrapper>
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
