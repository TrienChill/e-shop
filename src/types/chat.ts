export interface Conversation {
  id: string;
  customer_id: string;
  staff_id: string | null;
  last_message: string;
  last_message_at: string;
  is_read: boolean;
  created_at: string;
  customer?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  staff?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_ai: boolean;
  created_at: string;
}
