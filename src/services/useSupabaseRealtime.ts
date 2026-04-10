import { supabase } from '@/src/lib/supabase'; // Nhớ kiểm tra lại đường dẫn import file supabase của bạn
import { useEffect } from 'react';

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

    useEffect(() => {
        // Tạo tên kênh tự động để không bị trùng lặp
        const channelName = filter ? `realtime_${table}_${filter}` : `realtime_${table}`;

        // Khởi tạo trạm thu sóng
        const subscription = supabase
            .channel(channelName)
            .on(
                'postgres_changes' as any,
                {
                    event: event as any,
                    schema: 'public',
                    table: table,
                    filter: filter
                },
                (payload: any) => {
                    console.log(`[Realtime] Bảng ${table} vừa có thay đổi!`);
                    onUpdate(payload); // Gọi hàm cập nhật giao diện
                }
            )
            .subscribe();

        // Tự động dọn dẹp trạm thu sóng khi người dùng chuyển sang trang khác
        return () => {
            supabase.removeChannel(subscription);
        };
    }, [table, event, filter]); // Hook sẽ tự động chạy lại nếu các tham số này thay đổi
}