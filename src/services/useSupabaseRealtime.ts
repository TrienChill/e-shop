import { supabase } from '@/src/lib/supabase';
import { useEffect, useRef } from 'react';

// Định nghĩa các tham số truyền vào cho rõ ràng
interface UseRealtimeProps {
    table: string;                // Tên bảng cần nghe (VD: 'products')
    onUpdate: (payload: any) => void; // Hàm sẽ chạy khi có dữ liệu mới
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'; // Loại sự kiện (mặc định là nghe tất cả '*')
    filter?: string;              // Điều kiện lọc (VD: 'id=eq.1')
}

export function useSupabaseRealtime({
    table,
    onUpdate,
    event = '*',
    filter
}: UseRealtimeProps) {
    // Sử dụng useRef để lưu trữ callback mới nhất, tránh lỗi "stale closure"
    // mà không cần phải subscribe lại mỗi khi component re-render
    const callbackRef = useRef(onUpdate);
    
    useEffect(() => {
        callbackRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        // Tạo tên kênh duy nhất để tránh xung đột
        const channelName = `realtime_${table}_${event}_${filter || 'all'}_${Math.random().toString(36).substr(2, 5)}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes' as any,
                {
                    event: event,
                    schema: 'public',
                    table: table,
                    filter: filter
                },
                (payload: any) => {
                    callbackRef.current(payload);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, event, filter]);
}