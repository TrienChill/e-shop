import { supabase } from '../lib/supabase';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

export const sendMessageToAI = async (
  message: string,
  history: ChatMessage[]
) => {
  try {
    // Chỉ gửi những gì API cần
    const formattedHistory = history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const { data, error } = await supabase.functions.invoke('chat-assistant', {
      body: { message, history: formattedHistory },
    });

    if (error) {
      console.error('Lỗi khi gọi chat-assistant:', error);
      let errorDetail = error.message;
      try {
        if ((error as any).context) {
          const body = await (error as any).context.json();
          if (body && body.error) errorDetail = body.error;
        }
      } catch (e) {}
      throw new Error(errorDetail);
    }

    return data.reply;
  } catch (err: any) {
    console.error('sendMessageToAI Error:', err);
    throw new Error(err.message || 'Có lỗi xảy ra khi kết nối tới AI');
  }
};
