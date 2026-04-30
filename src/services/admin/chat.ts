import { supabase } from "@/src/lib/supabase";
import { Conversation, Message } from "@/src/types/chat";

export const chatService = {
  // 1. Lấy danh sách hội thoại
  getConversations: async (): Promise<Conversation[]> => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        customer:profiles!customer_id(id, full_name, avatar_url),
        staff:profiles!staff_id(id, full_name, avatar_url)
      `)
      .order('last_message_at', { ascending: false });

    if (error) throw error;
    return data as any;
  },

  // 2. Lấy tin nhắn của một hội thoại
  getMessages: async (conversationId: string): Promise<Message[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Message[];
  },

  // 3. Gửi tin nhắn mới
  sendMessage: async (
    conversationId: string, 
    content: string, 
    senderId: string,
    isAi: boolean = false
  ): Promise<Message> => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content,
        sender_id: senderId,
        is_ai: isAi,
      })
      .select()
      .single();

    if (error) throw error;

    // Cập nhật last_message của conversation
    await supabase
      .from('conversations')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        is_read: false
      })
      .eq('id', conversationId);

    return data as Message;
  },

  // 4. Gán nhân viên cho hội thoại
  assignStaff: async (conversationId: string, staffId: string): Promise<void> => {
    const { error } = await supabase
      .from('conversations')
      .update({ staff_id: staffId })
      .eq('id', conversationId);

    if (error) throw error;
  },

  // 5. Đánh dấu đã đọc
  markAsRead: async (conversationId: string): Promise<void> => {
    const { error } = await supabase
      .from('conversations')
      .update({ is_read: true })
      .eq('id', conversationId);

    if (error) throw error;
  },

  // 6. Lấy danh sách Staff để assign
  getStaffList: async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(id, full_name, avatar_url), role')
      .in('role', ['admin', 'staff']);

    if (error) throw error;
    return data.map(d => d.profiles);
  }
};
