export interface Conversation {
  id: number;
  user_id: string;
  staff_id: string | null;
  is_active: boolean;
  last_message: string | null;
  last_message_at: string;
  created_at: string;
  // Joined from profiles
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
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  is_ai: boolean;
  is_read: boolean;
  created_at: string;
}
