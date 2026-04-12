import { supabase } from '@/src/lib/supabase';
import { useEffect, useRef } from 'react';

export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  new: Record<string, any>;
  old: Record<string, any>;
}

interface UseRealtimeProps {
  table: string;
  onUpdate: (payload: RealtimePayload) => void;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

export function useSupabaseRealtime({
  table,
  onUpdate,
  event = '*',
  filter,
}: UseRealtimeProps) {
  const callbackRef = useRef(onUpdate);

  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const channelName = `realtime_${table}_${event}_${filter || 'all'}_${Math.random()
      .toString(36)
      .substr(2, 5)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: event,
          schema: 'public',
          table: table,
          filter: filter,
        },
        (payload: any) => {
          callbackRef.current({
            eventType: payload.eventType,
            table: payload.table,
            new: payload.new ?? {},
            old: payload.old ?? {},
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, filter]);
}