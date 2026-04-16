import { supabase } from '@/src/lib/supabase';
import { Gift, ShoppingBag } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function VoucherCollection({ onVoucherCollected, titleStyle, style }: { onVoucherCollected?: () => void, titleStyle?: any, style?: any }) {
  const [publicVouchers, setPublicVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicVouchers();
  }, []);

  const fetchPublicVouchers = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch public active vouchers
      const { data: allPublicVouchers } = await supabase
        .from('vouchers')
        .select('*')
        .eq('is_public', true)
        .eq('is_active', true);
      
      if (!allPublicVouchers) return;

      // Filter in JS for expired
      const validVouchers = allPublicVouchers.filter((v: any) => {
        if (!v.expired_at) return true;
        return new Date(v.expired_at) > new Date();
      });

      // 2. Fetch user's current vouchers to exclude them
      const { data: userVouchers } = await supabase
        .from('user_vouchers')
        .select('voucher_id')
        .eq('user_id', user.id);

      const collectedIds = new Set(userVouchers?.map(uv => uv.voucher_id) || []);

      const availableVouchers = validVouchers.filter(v => !collectedIds.has(v.id));

      setPublicVouchers(availableVouchers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCollect = async (voucherId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_vouchers')
        .insert({
          user_id: user.id,
          voucher_id: voucherId,
          is_used: false,
        });

      if (error) {
        Alert.alert("Lỗi", "Không thể thu thập mã giảm giá này.");
        return;
      }

      Alert.alert("Thành công", "Đã lưu mã giảm giá vào ví của bạn!");
      
      // Remove from list
      setPublicVouchers(prev => prev.filter(v => v.id !== voucherId));

      if (onVoucherCollected) {
        onVoucherCollected();
      }

    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />;
  }

  if (publicVouchers.length === 0) {
    return null; // Don't show if there are no vouchers to collect
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, titleStyle]}>Thu thập thêm mã giảm giá</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {publicVouchers.map((v) => (
          <View key={v.id} style={styles.card}>
            <View style={styles.cardLeft}>
              {v.discount_value > 10 ? <Gift color="#2563EB" size={24} /> : <ShoppingBag color="#2563EB" size={24} />}
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.voucherTitle} numberOfLines={1}>
                {v.discount_type === 'percentage' 
                  ? `Giảm ${v.discount_value}%${v.max_discount ? ` tối đa ${v.max_discount.toLocaleString("vi-VN")}đ` : ''}` 
                  : `Giảm ${v.discount_value.toLocaleString('vi-VN')}đ`}
              </Text>
              <Text style={styles.voucherCode}>Mã: {v.code}</Text>
              
              {v.usage_limit ? (
                <View style={styles.limitContainer}>
                  <View style={styles.limitBarBg}>
                    <View 
                      style={[
                        styles.limitBarFill, 
                        { width: `${Math.min(100, ((v.used_count || 0) / v.usage_limit) * 100)}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.limitText}>
                    Còn lại {Math.max(0, v.usage_limit - (v.used_count || 0))} lượt
                  </Text>
                </View>
              ) : (
                <Text style={styles.limitText}>Lượt dùng vô hạn</Text>
              )}

              <TouchableOpacity 
                style={styles.collectBtn} 
                onPress={() => handleCollect(v.id)}
              >
                <Text style={styles.collectBtnText}>Lưu ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  list: {
    paddingHorizontal: 24,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    width: 280,
    overflow: 'hidden',
  },
  cardLeft: {
    backgroundColor: '#EFF6FF',
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  cardRight: {
    padding: 12,
    flex: 1,
  },
  voucherTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  voucherCode: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  limitContainer: {
    marginBottom: 8,
    gap: 4,
  },
  limitBarBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  limitBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  limitText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  collectBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  collectBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  }
});
