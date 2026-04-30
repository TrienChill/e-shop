import { supabase } from "@/src/lib/supabase";
import { Conversation, Message } from "@/src/types/chat";

export const chatService = {
  // 1. Lấy danh sách hội thoại
  getConversations: async (): Promise<Conversation[]> => {
    // Lấy conversations
    const { data: convs, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (convError) throw convError;
    if (!convs || convs.length === 0) return [];

    // Lấy danh sách user_id và staff_id
    const userIds = convs.map(c => c.user_id).filter(Boolean);
    const staffIds = convs.map(c => c.staff_id).filter(Boolean);
    const allProfileIds = Array.from(new Set([...userIds, ...staffIds]));

    // Fetch thông tin profile
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', allProfileIds);

    if (profileError) throw profileError;

    // Gộp dữ liệu
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const enrichedConvs = convs.map(conv => ({
      ...conv,
      customer: profileMap.get(conv.user_id),
      staff: conv.staff_id ? profileMap.get(conv.staff_id) : undefined,
    }));

    return enrichedConvs as any;
  },

  // 2. Lấy tin nhắn của một hội thoại
  getMessages: async (conversationId: number): Promise<Message[]> => {
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
    conversationId: number, 
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
      })
      .eq('id', conversationId);

    return data as Message;
  },

  // 4. Gán nhân viên cho hội thoại
  assignStaff: async (conversationId: number, staffId: string): Promise<void> => {
    const { error } = await supabase
      .from('conversations')
      .update({ staff_id: staffId })
      .eq('id', conversationId);

    if (error) throw error;
  },

  // 5. Đánh dấu tin nhắn đã đọc (đánh dấu trên bảng messages)
  markAsRead: async (conversationId: number): Promise<void> => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false);

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
