
import {
  Bell,
  ChevronRight,
  Edit2,
  Heart,
  LogOut,
  Package,
  Sparkles,
  UserCog
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react'; // Thêm useState, useEffect
import {
  ActivityIndicator // Thêm ActivityIndicator
  ,

  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// --- Thêm Import Logic ---
import { supabase } from '@/src/lib/supabase';
import { uploadImageToSupabase } from '@/src/lib/upload'; // Giả sử bạn đã tạo file này ở bài trước
import { router } from 'expo-router';

// --- Constants & Types ---

const COLORS = {
  primary: '#0F49BD',
  background: '#FFFFFF',
  backgroundLight: '#F6F6F8',
  textDark: '#111318',
  textGrey: '#616F89',
  red: '#DC2626',
  redLight: '#FEF2F2',
  border: '#E5E7EB',
  navBg: 'rgba(20, 20, 20, 0.95)',
};

const AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqi1lulW9GgtMndZEuqAHSQF-2N3ontS3o3A3G-QcSyRjr6l1KEB1RXdP_OFVGaK7ZPBmH_jRi_1O_EaxB9Xv100aVqYoVEtROozQEABxDi9OHssRCp_IVvOrt_oBgBtl8557Hq9Ui5zLLJsOOP_4-TjAWnvKtjGaF5i8vtvjWI6yOdnbdTkLEyTvgmhikDol1ytK_Y-UUk_6QjqmolMToGfkNCG3a2S2BBJctG9GsG0C4ukl0H_bVke-LYWwFNA-_6PjzAiewzUE';

interface MenuItemData {
  id: string;
  title: string;
  icon: React.ElementType;
  badgeCount?: number;
  isLogout?: boolean;
}

interface ProfileHeaderProps {
  avatarUrl: string;
  userName: string;
  onEditAvatar: () => void;
  loading: boolean;
}


const MENU_DATA: MenuItemData[] = [
  { id: '1', title: 'Edit Profile', icon: UserCog },
  { id: '2', title: 'Order History', icon: Package },
  { id: '3', title: 'Wishlist', icon: Heart, badgeCount: 12 },
  { id: '4', title: 'Notifications', icon: Bell },
  { id: '5', title: 'Log Out', icon: LogOut, isLogout: true },
];

// --- Components ---

const ProfileHeader = ({ avatarUrl, userName, onEditAvatar, loading}: ProfileHeaderProps) => (
  <View style={styles.headerContainer}>
    {/* Avatar Section */}
    <View style={styles.avatarWrapper}>
      <Image source={{ uri: avatarUrl || AVATAR_URL}} 
      
      style={styles.avatarImage} />
      <TouchableOpacity style={styles.editAvatarButton} activeOpacity={0.8}
      onPress={onEditAvatar} //gọi hàm sửa ảnh
      >
        {loading ? ( < ActivityIndicator size="small" color="#FFFFFF" /> ) : (
          <Edit2 size={16} color="#FFFFFF" strokeWidth={2.5} />
        )}
      </TouchableOpacity>
    </View>

    {/* User Info */}
    <View style={styles.userInfo}>
    <Text style={styles.userName}>{userName || 'User Name'}</Text>
      <Text style={styles.userPhone}>+1 (555) 019-2834</Text>

      {/* AI Badge */}
      <View style={styles.aiBadge}>
        <Sparkles size={16} color={COLORS.primary} fill={COLORS.primary} />
        <Text style={styles.aiBadgeText}>AI STYLE PROFILE ACTIVE</Text>
      </View>
    </View>

    <Text style={styles.sectionTitle}>ACCOUNT SETTINGS</Text>
  </View>
);

const MenuItem = ({ item }: { item: MenuItemData }) => {
  const IconComponent = item.icon;
  const isDestructive = item.isLogout;

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        isDestructive && styles.menuItemDestructive,
      ]}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconCircle,
          isDestructive && styles.iconCircleDestructive,
        ]}
      >
        <IconComponent
          size={22}
          color={isDestructive ? COLORS.red : COLORS.textDark}
        />
      </View>
      
      <View style={styles.menuContent}>
        <Text
          style={[
            styles.menuTitle,
            isDestructive && styles.menuTitleDestructive,
          ]}
        >
          {item.title}
        </Text>
      </View>

      {item.badgeCount && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badgeCount}</Text>
        </View>
      )}

      {!isDestructive && (
        <ChevronRight size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );
};



// --- Main Screen ---

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  // 1. Lấy thông tin User khi vào màn hình
  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Lấy thêm thông tin từ bảng profiles nếu có (tên, avatar...)
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        // Gộp thông tin user auth và profile
        setProfile({ ...user, ...data });
    }
  };

  // 2. Chức năng Đăng xuất
  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { 
            text: 'Log Out', 
            style: 'destructive', 
            onPress: async () => {
                const { error } = await supabase.auth.signOut();
                if (error) Alert.alert('Error', error.message);
                else router.replace('/(auth)/login'); // Chuyển về trang login
            }
        }
    ]);
  };

  // 3. Chức năng Upload Avatar
  const handleUpdateAvatar = async () => {
    setLoadingAvatar(true);
    // Gọi hàm upload từ file tiện ích
    const publicUrl = await uploadImageToSupabase();
    
    if (publicUrl && profile?.id) {
        // Lưu URL mới vào bảng profiles
        const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', profile.id);
            
        if (!error) {
            // Cập nhật lại giao diện ngay lập tức
            setProfile({ ...profile, avatar_url: publicUrl });
            Alert.alert('Success', 'Profile picture updated!');
        } else {
            Alert.alert('Error', 'Failed to update profile picture.');
        }
    }
    setLoadingAvatar(false);
  };

  // 4. Xử lý khi bấm vào Menu Item
  const handleMenuItemPress = (item: MenuItemData) => {
    if (item.isLogout) {
        handleLogout();
    } else {
        // Xử lý các mục khác (ví dụ chuyển trang Order History...)
        console.log('Pressed:', item.title);
    }
  };

  const renderItem = ({ item }: { item: MenuItemData }) => {
    const MenuItemComponent = (
        <TouchableOpacity
            style={[
                styles.menuItem,
                item.isLogout && styles.menuItemDestructive,
            ]}
            activeOpacity={0.7}
            onPress={() => handleMenuItemPress(item)} // Gắn sự kiện bấm
        >
             {/* ... (Giữ nguyên phần giao diện icon và text của MenuItem cũ) ... */}
             <View style={[styles.iconCircle, item.isLogout && styles.iconCircleDestructive]}>
                <item.icon size={22} color={item.isLogout ? COLORS.red : COLORS.textDark} />
             </View>
             
             <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, item.isLogout && styles.menuTitleDestructive]}>
                    {item.title}
                </Text>
             </View>

             {item.badgeCount && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badgeCount}</Text>
                </View>
             )}

             {!item.isLogout && <ChevronRight size={20} color="#9CA3AF" />}
        </TouchableOpacity>
    );

    if (item.isLogout) {
      return (
        <>
          <View style={styles.separator} />
          {MenuItemComponent}
        </>
      );
    }
    return MenuItemComponent;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profile</Text>
      </View>

      <FlatList
        data={MENU_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        // Truyền props xuống Header
        ListHeaderComponent={() => (
            <ProfileHeader 
                avatarUrl={profile?.avatar_url}
                userName={profile?.full_name || profile?.email || 'User'} 
                onEditAvatar={handleUpdateAvatar}
                loading={loadingAvatar}
            />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// --- Styles ---

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent', // Kept generic if needed later
    zIndex: 10,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  listContent: {
    paddingBottom: 120, // Space for floating nav
  },
  
  // Header Section
  headerContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: COLORS.backgroundLight,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.textGrey,
    fontWeight: '500',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF', // Indigo-50 equivalent
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textGrey,
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    // Emulate hover effect visually with standard bg or slight gray
    backgroundColor: 'transparent', 
  },
  menuItemDestructive: {
    backgroundColor: COLORS.redLight,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconCircleDestructive: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  menuTitleDestructive: {
    color: COLORS.red,
  },
  badge: {
    backgroundColor: 'rgba(15, 73, 189, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
    marginHorizontal: 16,
  },

  // Bottom Navigation
  bottomNavContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  bottomNavContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.navBg,
    width: width * 0.9,
    maxWidth: 380,
    height: 72,
    borderRadius: 40,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    width: 48,
  },
  activeNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.red,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  activeIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    position: 'absolute',
    bottom: -10,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40, // Pulls it up
    borderWidth: 4,
    borderColor: COLORS.background, // Match screen bg for cutout effect
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
