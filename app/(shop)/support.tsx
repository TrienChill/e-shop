import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Pressable, Platform, KeyboardAvoidingView, TextInput, FlatList, Image } from 'react-native';
import { useAuth } from '@/src/auth/AuthContext';
import { useAppearance } from '@/src/context/AppearanceContext';
import { userChatService } from '@/src/services/shop/chat';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'expo-router';
import { ChevronLeft, Send as SendIcon, Bot } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Message as DBMessage, Conversation } from '@/src/types/chat';

export default function ChatSupportScreen() {
  const { session } = useAuth();
  const { primaryColor } = useAppearance();
  const router = useRouter();

  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (session?.user.id) {
      initChat();
    }
  }, [session]);

  const initChat = async () => {
    try {
      setLoading(true);
      const conv = await userChatService.getOrCreateConversation(session!.user.id);
      setConversation(conv);

      const dbMessages = await userChatService.getMessages(conv.id);
      // Lấy từ mới nhất đến cũ nhất nhưng FlatList set inverted={true}
      setMessages(dbMessages);
    } catch (error) {
      console.error('Lỗi khởi tạo chat:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!conversation) return;

    // Lắng nghe tin nhắn mới
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newDbMsg = payload.new as DBMessage;
          
          if (
            Number(newDbMsg.conversation_id) === conversation.id &&
            newDbMsg.sender_id !== session?.user.id
          ) {
            setMessages((prev) => [newDbMsg, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation]);

  const handleSend = async () => {
    if (!inputText.trim() || !conversation || !session) return;

    const content = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      // Optimistic Update
      const optimisticMsg: DBMessage = {
        id: Date.now(), // Fake ID
        conversation_id: conversation.id,
        content,
        sender_id: session.user.id,
        is_ai: false,
        is_read: false,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [optimisticMsg, ...prev]);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

      await userChatService.sendMessage(conversation.id, content, session.user.id);
    } catch (error) {
      console.error('Lỗi gửi tin nhắn:', error);
      // Rollback logic could be here
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: DBMessage }) => {
    const isMe = item.sender_id === session?.user.id;

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowRight : styles.messageRowLeft]}>
        {!isMe && !item.is_ai && (
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/8943/8943377.png' }}
            style={styles.msgAvatar}
          />
        )}
        {!isMe && item.is_ai && (
          <View style={[styles.aiAvatar, { backgroundColor: primaryColor }]}>
            <Bot size={16} color="#FFF" />
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isMe ? { backgroundColor: primaryColor } : styles.messageBubbleLeft
        ]}>
          <Text style={[styles.messageText, isMe ? { color: '#FFF' } : { color: '#1F2937' }]} selectable>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#111827" />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Hỗ trợ khách hàng</Text>
            <View style={styles.statusContainer}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Trực tuyến</Text>
            </View>
          </View>
        </View>

        {/* CHAT AREA */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text style={styles.loadingText}>Đang kết nối...</Text>
          </View>
        ) : (
          <View style={styles.chatContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => String(item.id)}
              renderItem={renderMessage}
              inverted={true} // Cuộn từ dưới lên (theo mảng sắp xếp descending)
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesList}
            />

            {/* INPUT AREA */}
            <View style={styles.inputArea}>
              <TextInput
                style={styles.inputField}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#9CA3AF"
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
                  <SendIcon size={18} color={inputText.trim() ? "#FFF" : "#9CA3AF"} />
                )}
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  messageBubbleLeft: {
    backgroundColor: '#E5E7EB',
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    ...Platform.select({
      ios: { paddingBottom: 24 }, // Safe area for iOS
    }),
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
