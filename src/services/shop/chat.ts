import { supabase } from "@/src/lib/supabase";
import { Message, Conversation } from "@/src/types/chat";

export const userChatService = {
  // 1. Khởi tạo hoặc lấy hội thoại của người dùng
  getOrCreateConversation: async (userId: string): Promise<Conversation> => {
    // Tìm hội thoại hiện có
    const { data: existingConv, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingConv && !fetchError) {
      return existingConv as Conversation;
    }

    // Nếu chưa có, tạo mới
    const { data: newConv, error: insertError } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        last_message: "Bắt đầu cuộc trò chuyện",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return newConv as Conversation;
  },

  // 2. Lấy tin nhắn
  getMessages: async (conversationId: number): Promise<Message[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false }); // GiftedChat cần order descending

    if (error) throw error;
    return data as Message[];
  },

  // 3. Gửi tin nhắn từ phía người dùng
  sendMessage: async (
    conversationId: number,
    content: string,
    senderId: string
  ): Promise<Message> => {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content,
        sender_id: senderId,
        is_ai: false,
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
  }
};
