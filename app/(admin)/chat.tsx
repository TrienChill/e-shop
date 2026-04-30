import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, FlatList, Image, TextInput, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView } from "react-native";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppearance } from "@/src/context/AppearanceContext";
import { chatService } from "@/src/services/admin/chat";
import { Conversation, Message } from "@/src/types/chat";
import { supabase } from "@/src/lib/supabase";
import { Bot, Send, User, Clock, Search, MoreVertical, Package, MapPin, MessageSquare } from "lucide-react-native";

export default function AdminChat() {
  const { session } = useAuth();
  const { primaryColor } = useAppearance();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Right sidebar data
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Assign Staff Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);

  // 1. Fetch conversations
  useEffect(() => {
    loadConversations();
    loadStaffList();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await chatService.getConversations();
      setConversations(data);
      if (data.length > 0 && !activeConv) {
        setActiveConv(data[0]);
      }
    } catch (error) {
      console.error("Lỗi tải hội thoại:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffList = async () => {
    try {
      const data = await chatService.getStaffList();
      setStaffList(data);
    } catch (error) {
      console.error("Lỗi tải danh sách staff:", error);
    }
  };

  // 2. Load messages and customer orders when active conversation changes
  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.id);
      loadCustomerOrders(activeConv.customer_id);
      
      if (!activeConv.is_read) {
        chatService.markAsRead(activeConv.id);
        setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, is_read: true } : c));
      }
    }
  }, [activeConv]);

  const loadMessages = async (convId: string) => {
    try {
      const data = await chatService.getMessages(convId);
      setMessages(data);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error("Lỗi tải tin nhắn:", error);
    }
  };

  const loadCustomerOrders = async (customerId: string) => {
    try {
      setLoadingOrders(true);
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (!error && data) {
        setCustomerOrders(data);
      }
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // 3. Real-time Subscription
  useEffect(() => {
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const newMsg = payload.new as Message;
        
        // Cập nhật messages nếu đang xem hội thoại này
        if (activeConv && newMsg.conversation_id === activeConv.id) {
          setMessages(prev => [...prev, newMsg]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }

        // Cập nhật last_message cho sidebar bên trái
        setConversations(prev => {
          let updated = [...prev];
          const idx = updated.findIndex(c => c.id === newMsg.conversation_id);
          if (idx !== -1) {
            updated[idx] = { 
              ...updated[idx], 
              last_message: newMsg.content, 
              last_message_at: newMsg.created_at,
              is_read: activeConv?.id === newMsg.conversation_id ? true : false
            };
            // Đưa hội thoại mới nhất lên đầu
            const [item] = updated.splice(idx, 1);
            updated.unshift(item);
          }
          return updated;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConv]);

  // 4. Send Message
  const handleSend = async () => {
    if (!inputText.trim() || !activeConv || !session?.user.id) return;

    const content = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const newMsg = await chatService.sendMessage(
        activeConv.id, 
        content, 
        session.user.id, 
        false
      );
      // Real-time sẽ tự động cập nhật, nhưng ta có thể chèn cục bộ cho nhanh
      // setMessages(prev => [...prev, newMsg]);
      // setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error("Lỗi gửi tin nhắn:", error);
    } finally {
      setSending(false);
    }
  };

  // 5. Assign Staff
  const handleAssignStaff = async (staffId: string) => {
    if (!activeConv) return;
    try {
      setLoadingStaff(true);
      await chatService.assignStaff(activeConv.id, staffId);
      
      // Cập nhật lại UI
      setConversations(prev => prev.map(c => 
        c.id === activeConv.id ? { ...c, staff_id: staffId } : c
      ));
      setActiveConv(prev => prev ? { ...prev, staff_id: staffId } : null);
      setShowAssignModal(false);
    } catch (error) {
      console.error("Lỗi phân công nhân viên:", error);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Render Left Sidebar Item
  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const isActive = activeConv?.id === item.id;
    const date = new Date(item.last_message_at);
    const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    return (
      <Pressable
        style={[
          styles.convItem,
          isActive && { backgroundColor: '#F3F4F6' },
        ]}
        onPress={() => setActiveConv(item)}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: item.customer?.avatar_url || 'https://via.placeholder.com/150' }}
            style={styles.avatar}
          />
          {!item.is_read && <View style={[styles.unreadBadge, { backgroundColor: primaryColor }]} />}
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <Text style={[styles.convName, !item.is_read && styles.unreadText]} numberOfLines={1}>
              {item.customer?.full_name || 'Khách hàng'}
            </Text>
            <Text style={styles.convTime}>{timeStr}</Text>
          </View>
          <Text style={[styles.convLastMessage, !item.is_read && styles.unreadText]} numberOfLines={1}>
            {item.last_message}
          </Text>
        </View>
      </Pressable>
    );
  };

  // Render Message Bubble
  const renderMessage = ({ item }: { item: Message }) => {
    // Nếu sender_id không phải của khách (customer_id của conv hiện tại), tức là Admin/Staff
    const isMine = item.sender_id !== activeConv?.customer_id;

    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowRight : styles.messageRowLeft]}>
        {!isMine && !item.is_ai && (
          <Image
            source={{ uri: activeConv?.customer?.avatar_url || 'https://via.placeholder.com/150' }}
            style={styles.msgAvatar}
          />
        )}
        {!isMine && item.is_ai && (
          <View style={styles.aiAvatar}>
            <Bot size={16} color="#FFF" />
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isMine ? { backgroundColor: primaryColor } : styles.messageBubbleLeft
        ]}>
          <Text style={[styles.messageText, isMine ? { color: '#FFF' } : { color: '#1F2937' }]} selectable>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* LEFT COLUMN: INBOX LIST */}
      <View style={styles.leftColumn}>
        <View style={styles.leftHeader}>
          <Text style={styles.leftTitle}>Tin nhắn</Text>
          <View style={styles.searchBox}>
            <Search size={18} color="#9CA3AF" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Tìm kiếm..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={item => item.id}
            renderItem={renderConversationItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* MIDDLE COLUMN: CHAT FRAME */}
      <View style={styles.middleColumn}>
        {activeConv ? (
          <>
            <View style={styles.chatHeader}>
              <View style={styles.chatHeaderInfo}>
                <Image
                  source={{ uri: activeConv.customer?.avatar_url || 'https://via.placeholder.com/150' }}
                  style={styles.chatHeaderAvatar}
                />
                <View>
                  <Text style={styles.chatHeaderName}>{activeConv.customer?.full_name || 'Khách hàng'}</Text>
                  <Text style={styles.chatHeaderStatus}>Đang trực tuyến</Text>
                </View>
              </View>
              <View style={styles.chatHeaderActions}>
                {/* Nút Giao việc */}
                <View style={{ position: 'relative' }}>
                  <Pressable 
                    style={[styles.assignBtn, activeConv.staff_id && { backgroundColor: '#E0F2FE' }]}
                    onPress={() => setShowAssignModal(!showAssignModal)}
                  >
                    <User size={16} color={activeConv.staff_id ? "#0284C7" : "#4B5563"} />
                    <Text style={[styles.assignBtnText, activeConv.staff_id && { color: "#0284C7" }]}>
                      {activeConv.staff_id 
                        ? staffList.find(s => s.id === activeConv.staff_id)?.full_name || "Đã giao việc"
                        : "Giao cho nhân viên"}
                    </Text>
                  </Pressable>
                  
                  {/* Dropdown Phân công */}
                  {showAssignModal && (
                    <View style={styles.assignDropdown}>
                      <Text style={styles.dropdownTitle}>Chọn nhân viên hỗ trợ</Text>
                      {staffList.map((staff) => (
                        <Pressable 
                          key={staff.id} 
                          style={styles.staffItem}
                          onPress={() => handleAssignStaff(staff.id)}
                        >
                          <Image source={{ uri: staff.avatar_url || 'https://via.placeholder.com/150' }} style={styles.staffAvatar} />
                          <Text style={styles.staffName}>{staff.full_name}</Text>
                          {activeConv.staff_id === staff.id && (
                            <View style={[styles.staffCheck, { backgroundColor: primaryColor }]} />
                          )}
                        </Pressable>
                      ))}
                      {loadingStaff && <ActivityIndicator size="small" color={primaryColor} style={{ marginTop: 10 }} />}
                    </View>
                  )}
                </View>
                <Pressable style={styles.iconBtn}>
                  <MoreVertical size={20} color="#4B5563" />
                </Pressable>
              </View>
            </View>

            <View style={styles.chatMessagesArea}>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              />
            </View>

            <View style={styles.chatInputArea}>
              <TextInput
                style={styles.inputField}
                placeholder="Nhập tin nhắn..."
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                multiline={false}
              />
              <Pressable 
                style={[styles.sendBtn, { backgroundColor: inputText.trim() ? primaryColor : '#E5E7EB' }]}
                onPress={handleSend}
                disabled={sending || !inputText.trim()}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={18} color={inputText.trim() ? "#FFF" : "#9CA3AF"} />
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.emptyChat}>
            <MessageSquare size={48} color="#D1D5DB" />
            <Text style={styles.emptyChatText}>Chọn một hội thoại để bắt đầu</Text>
          </View>
        )}
      </View>

      {/* RIGHT COLUMN: CUSTOMER INFO */}
      <View style={styles.rightColumn}>
        {activeConv ? (
          <View style={styles.profileContainer}>
            <View style={styles.profileHeader}>
              <Image
                source={{ uri: activeConv.customer?.avatar_url || 'https://via.placeholder.com/150' }}
                style={styles.profileAvatar}
              />
              <Text style={styles.profileName}>{activeConv.customer?.full_name || 'Khách hàng'}</Text>
              <Text style={styles.profileId}>ID: {activeConv.customer?.id?.substring(0,8)}</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
              <View style={styles.infoRow}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.infoText}>Chưa cập nhật địa chỉ</Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Đơn hàng gần đây ({customerOrders.length})</Text>
              {loadingOrders ? (
                <ActivityIndicator size="small" color={primaryColor} />
              ) : customerOrders.length > 0 ? (
                customerOrders.map((order) => (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderCardHeader}>
                      <Text style={styles.orderId}>#{order.id.substring(0,6)}</Text>
                      <Text style={[styles.orderStatus, order.status === 'completed' && { color: '#059669', backgroundColor: '#D1FAE5' }]}>
                        {order.status}
                      </Text>
                    </View>
                    <View style={styles.orderCardFooter}>
                      <Text style={styles.orderDate}>
                        {new Date(order.created_at).toLocaleDateString('vi-VN')}
                      </Text>
                      <Text style={styles.orderAmount}>
                        {order.total_amount?.toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noOrdersText}>Chưa có đơn hàng nào</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyProfile}>
            <User size={48} color="#D1D5DB" />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  
  // Left Column
  leftColumn: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  leftHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  leftTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827',
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  convItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  convInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  convTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  convLastMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  unreadText: {
    color: '#111827',
    fontWeight: '700',
  },

  // Middle Column
  middleColumn: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    flexDirection: 'column',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  assignBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  chatMessagesArea: {
    flex: 1,
  },
  messagesList: {
    padding: 20,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    maxWidth: '80%',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  messageBubbleLeft: {
    backgroundColor: '#FFF',
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatInputArea: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 100,
    ...Platform.select({ web: { outlineStyle: 'none' } as any }),
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChatText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },

  // Right Column
  rightColumn: {
    width: 320,
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  profileContainer: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileId: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  infoSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
  },
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  orderStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'capitalize',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  orderAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  noOrdersText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  emptyProfile: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 240,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 8,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  staffAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  staffName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  staffCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
