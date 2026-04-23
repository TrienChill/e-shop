import { supabase } from '../lib/supabase';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

// Retry helper for AI calls
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Only retry on specific errors
      const isRetryable =
        error.message?.includes('high demand') ||
        error.message?.includes('quá tải') ||
        error.message?.includes('429') ||
        error.message?.includes('500') ||
        error.message?.includes('503') ||
        error.message?.includes('temporarily') ||
        error.message?.includes('tạm thời');

      if (isRetryable && attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[Chat] AI đang quá tải, thử lại sau ${delay}ms... (lần ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

export const sendMessageToAI = async (
  message: string,
  history: ChatMessage[]
) => {
  const callAPI = async () => {
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
  };

  // Retry with backoff for high demand errors
  return retryWithBackoff(callAPI, 3, 2000);
};
