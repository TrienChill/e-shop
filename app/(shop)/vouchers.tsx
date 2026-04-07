import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import {
  ArrowLeft,
  Settings,
  LayoutGrid,
  ShoppingBag,
  Heart,
  Star,
  Cloud,
  CheckCircle2,
  Ticket,
  ChevronRight,
  Smile,
  Shirt,
} from 'lucide-react-native';
import Svg, { Path, Circle, Rect, G, Defs, Mask } from 'react-native-svg';
import { Link, router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';

// Types
interface Voucher {
  id: string;
  title: string;
  description: string;
  validUntil: string;
  daysLeft?: number;
  isCollected: boolean;
  type: 'normal' | 'expiring';
  icon: React.ReactNode;
}

interface RewardProgress {
  id: string;
  title: string;
  description: string;
  progress: number;
  icon: React.ReactNode;
}

// Custom Ticket Shape for Voucher
const VoucherTicket = ({ header, content, type }: { header: React.ReactNode; content: React.ReactNode; type: 'normal' | 'expiring' }) => {
  const isExpiring = type === 'expiring';
  const borderColor = isExpiring ? '#FCA3A3' : '#3B82F6';
  const headerBg = isExpiring ? '#FFF1F1' : '#F1F7FF';

  return (
    <View style={{ marginBottom: 24, position: 'relative' }}>
      <View
        style={{
          borderColor,
          borderWidth: 1.5,
          borderRadius: 24,
          backgroundColor: '#FFF',
          overflow: 'hidden',
          minHeight: 150,
          shadowColor: isExpiring ? '#FCA3A3' : '#3B82F6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        {/* Header Part */}
        <View style={{ backgroundColor: headerBg, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: borderColor, borderStyle: 'dashed' }}>
          {header}
        </View>
        {/* Content Part */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {content}
        </View>
      </View>

      {/* Semicircle cutouts */}
      <View
        style={{
          position: 'absolute',
          left: -10,
          top: 52, // Adjusted to match the dashed line position
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#FFF', // Match screen background
          borderRightWidth: 1.5,
          borderRightColor: borderColor,
          zIndex: 10,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -10,
          top: 52,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#FFF',
          borderLeftWidth: 1.5,
          borderLeftColor: borderColor,
          zIndex: 10,
        }}
      />
    </View>
  );
};

// Circular Progress Component
const CircularProgress = ({
  progress,
  size = 110,
  strokeWidth = 8,
  children,
  completed = false,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  children: React.ReactNode;
  completed?: boolean;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#EFF6FF"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#2563EB"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={{ position: 'absolute' }}>{children}</View>
      {completed && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            backgroundColor: '#10B981',
            borderRadius: 12,
            padding: 2,
            borderWidth: 2,
            borderColor: '#FFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <CheckCircle2 size={14} color="#FFF" />
        </View>
      )}
    </View>
  );
};

export default function VouchersScreen() {
  const [activeTab, setActiveTab] = useState<'rewards' | 'progress'>('rewards');
  const [userVouchers, setUserVouchers] = useState<Voucher[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mock data as fallback
  const mockVouchers: Voucher[] = [
    {
      id: '1',
      title: 'Khách hàng mới',
      description: 'Đơn hàng đầu tiên\nGiảm 5% cho đơn hàng tiếp theo',
      validUntil: '21.04.2026',
      daysLeft: 3,
      isCollected: true,
      type: 'expiring',
      icon: <ShoppingBag size={22} color="#2563EB" />,
    },
    {
      id: '2',
      title: 'Quà Sinh Nhật',
      description: 'Cảm ơn bạn đã đồng hành\nGiảm 10% tối đa 50K',
      validUntil: '20.06.2026',
      isCollected: true,
      type: 'normal',
      icon: <Ticket size={24} color="#2563EB" />,
    }
  ];

  React.useEffect(() => {
    const fetchMyVouchers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Profile for Greeting
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, total_orders_completed')
          .eq('id', user.id)
          .single();
        if (profile) setUserProfile(profile);

        // 2. Fetch User Vouchers 
        // Lệnh này yêu cầu file 01_voucher_membership_upgrade.sql đã được chạy
        const { data: vData, error } = await supabase
          .from('user_vouchers')
          .select(`
            id,
            is_used,
            vouchers (
              id,
              code,
              description,
              expired_at,
              discount_type,
              discount_value,
              voucher_type
            )
          `)
          .eq('user_id', user.id)
          .eq('is_used', false);

        if (error) throw error; // Chuyển sang catch nếu bảng chưa tồn tại

        if (vData && vData.length > 0) {
          const formatted = vData.map((item: any) => {
            const v = item.vouchers;
            // Tính số ngày còn lại
            const expiryDate = new Date(v.expired_at);
            const today = new Date();
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const isExpiring = diffDays > 0 && diffDays <= 3;
            const validUntilStr = expiryDate.toLocaleDateString('vi-VN');

            // Gán icon
            let IconComponent = <Ticket size={24} color="#2563EB" />;
            if (v.voucher_type === 'freeship') IconComponent = <Cloud size={24} color="#2563EB" />;
            
            return {
              id: item.id,
              title: v.code,
              description: v.description || (v.discount_type === 'percentage' 
                  ? `Giảm ${v.discount_value}% tổng đơn\nThu thập lúc ${new Date().toLocaleDateString('vi-VN')}` 
                  : `Giảm ${v.discount_value.toLocaleString('vi-VN')}đ\nThu thập lúc ${new Date().toLocaleDateString('vi-VN')}`),
              validUntil: validUntilStr,
              daysLeft: isExpiring ? diffDays : undefined,
              isCollected: true,
              type: isExpiring ? ('expiring' as const) : ('normal' as const),
              icon: IconComponent
            };
          });
          setUserVouchers(formatted);
        } else {
           // Không có voucher nào
           setUserVouchers([]);
        }
      } catch (error) {
        console.log('Lỗi fetch hoặc SQL migration chưa được chạy. Đang dùng mock data.', error);
        setUserVouchers(mockVouchers);
      } finally {
        setLoading(false);
      }
    };
    fetchMyVouchers();
  }, []);

  const rewardsProgress: RewardProgress[] = [
    {
      id: '1',
      title: 'Đơn thứ 5',
      description: 'Hoàn thành 5 đơn hàng để thăng hạng và nhận ưu đãi siêu to!',
      progress: userProfile?.total_orders_completed ? Math.min((userProfile.total_orders_completed / 5) * 100, 100) : 0,
      icon: <ShoppingBag size={28} color="#2563EB" />,
    },
    {
      id: '2',
      title: 'Khách thân thiết',
      description: 'Tiếp tục mua hàng để thăng hạng và nhận thêm nhiều đặc quyền.',
      progress: 75,
      icon: <Heart size={28} color="#2563EB" />,
    },
    {
      id: '3',
      title: 'Người đánh giá',
      description: 'Chia sẻ cảm nhận về sản phẩm để giúp cộng đồng mua sắm tốt hơn.',
      progress: 60,
      icon: <Star size={28} color="#2563EB" />,
    },
    {
      id: '4',
      title: 'Tâm hồn lớn',
      description: 'Tham gia các hoạt động thiện nguyện để lan tỏa yêu thương.',
      progress: 0,
      icon: <Cloud size={28} color="#2563EB" />,
    },
    {
      id: '5',
      title: 'Sưu tầm áo thun',
      description: 'Sở hữu ít nhất 5 mẫu áo thun trong bộ sưu tập mới nhất.',
      progress: 0,
      icon: <Shirt size={28} color="#2563EB" />,
    },
    {
      id: '6',
      title: '10+ Đơn hàng',
      description: 'Đạt mốc 10 đơn hàng để nhận huy hiệu "Bậc thầy mua sắm".',
      progress: userProfile?.total_orders_completed ? Math.min((userProfile.total_orders_completed / 10) * 100, 100) : 0,
      icon: <Smile size={28} color="#2563EB" />,
    },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'TC';
    const split = name.split(' ');
    if (split.length > 1) return (split[0][0] + split[split.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
      {/* Header Info */}
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, backgroundColor: '#F1F5F9', borderRadius: 28, marginRight: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F8FAFC' }}>
             <Text style={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 18 }}>
                {getInitials(userProfile?.full_name)}
             </Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#0F172A' }}>Kho Voucher</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={{ width: 44, height: 44, backgroundColor: '#2563EB', borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#BFDBFE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 5 }}>
            <LayoutGrid size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, backgroundColor: '#EFF6FF', borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'relative' }}>
              <ArrowLeft size={22} color="#2563EB" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 24, marginVertical: 24 }}>
        <TouchableOpacity
          onPress={() => setActiveTab('rewards')}
          style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: activeTab === 'rewards' ? '#EFF6FF' : '#F8FAFC' }}
        >
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: activeTab === 'rewards' ? '#2563EB' : '#94A3B8' }}>
            Phần thưởng
          </Text>
        </TouchableOpacity>
        <View style={{ width: 16 }} />
        <TouchableOpacity
          onPress={() => setActiveTab('progress')}
          style={{ flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 16, backgroundColor: activeTab === 'progress' ? '#EFF6FF' : '#F8FAFC' }}
        >
          <Text style={{ fontWeight: 'bold', fontSize: 16, color: activeTab === 'progress' ? '#2563EB' : '#94A3B8' }}>
            Tiến trình
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {activeTab === 'rewards' ? (
          <View>
            {userVouchers.map((voucher) => (
              <VoucherTicket 
                key={voucher.id} 
                type={voucher.type}
                header={
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Text style={{ fontSize: 19, fontWeight: 'bold', color: voucher.type === 'expiring' ? '#F87171' : '#2563EB' }}>
                      {voucher.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      {voucher.daysLeft && (
                        <Text style={{ color: '#F87171', fontSize: 12, fontWeight: '600' }}>còn {voucher.daysLeft} ngày</Text>
                      )}
                      <View style={{ backgroundColor: voucher.type === 'expiring' ? 'rgba(254, 202, 202, 0.5)' : 'rgba(226, 232, 240, 0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                        <Text style={{ color: '#0F172A', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>
                          Hạn dùng {voucher.validUntil}
                        </Text>
                      </View>
                    </View>
                  </View>
                }
                content={
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                      <View style={{ width: 48, height: 48, backgroundColor: '#FFF', borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginRight: 16, borderWidth: 1, borderColor: '#F8FAFC' }}>
                        {voucher.icon}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#0F172A', fontWeight: '900', fontSize: 17, lineHeight: 22 }}>
                          {voucher.description.split('\n')[0]}
                        </Text>
                        <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4, fontWeight: '500' }}>
                          {voucher.description.split('\n')[1]}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, shadowColor: '#BFDBFE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 15 }}>Đã thu thập</Text>
                    </TouchableOpacity>
                  </>
                }
              />
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {rewardsProgress.map((item) => (
              <View key={item.id} style={{ width: '47%', marginBottom: 48, alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#F8FAFC' }}>
                <CircularProgress
                  progress={item.progress}
                  completed={item.progress === 100}
                  size={110}
                  strokeWidth={8}
                >
                  <View style={{ width: 80, height: 80, backgroundColor: 'rgba(239, 246, 255, 0.5)', borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </View>
                </CircularProgress>
                <Text style={{ color: '#0F172A', fontWeight: '900', textAlign: 'center', marginTop: 24, fontSize: 17 }} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={{ height: 60, justifyContent: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 18 }} numberOfLines={3}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
