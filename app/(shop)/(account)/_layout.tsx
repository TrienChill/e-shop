import { usePathname, useRouter } from "expo-router";
import { Package, Settings, User } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Slot } from "expo-router";
import { supabase } from "@/src/lib/supabase";

const SIDEBAR_WIDTH = 260;
const BREAKPOINT = 1024;

const NAV_ITEMS = [
  { key: "profile", label: "Quản lý tài khoản", icon: User, href: "/(shop)/(account)/profile" },
  { key: "my-activity", label: "Hoạt động của tôi", icon: Package, href: "/(shop)/(account)/my-activity" },
  { key: "settings", label: "Cài đặt", icon: Settings, href: "/(shop)/(account)/settings" },
];

export function AccountSidebar({ profile }: { profile: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <View style={[styles.sidebar, { paddingTop: Math.max(insets.top, 20) }]}>
      <View style={styles.userHeader}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {profile?.full_name?.[0]?.toUpperCase() ||
              profile?.email?.[0]?.toUpperCase() ||
              "U"}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {profile?.full_name || "Khách hàng"}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {profile?.email || ""}
          </Text>
        </View>
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, active && styles.navItemActive]}
              activeOpacity={0.7}
              onPress={() => router.push(item.href as any)}
            >
              <Icon size={20} color={active ? "#0055FF" : "#6B7280"} />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function useAccountLayout() {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= BREAKPOINT;
}

export default function AccountLayout() {
  const { width } = useWindowDimensions();
  const [profile, setProfile] = useState<any>(null);
  const IS_WEB_DESKTOP = useAccountLayout();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      } catch {
        // ignore
      }
    };
    fetchProfile();
  }, []);

  // Mobile: use standard SafeAreaView (no sidebar)
  if (!IS_WEB_DESKTOP) {
    return <Slot />;
  }

  // Web Desktop: sidebar (left 25%) + content (right 75%)
  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <AccountSidebar profile={profile} />
        <ScrollView
          style={styles.contentArea}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          <Slot />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  body: {
    flex: 1,
    flexDirection: "row",
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingBottom: 32,
    backgroundColor: "#FAFAFA",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 8,
    gap: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0055FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: "#6B7280",
  },
  navList: {
    paddingTop: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: "#EFF6FF",
  },
  navLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  navLabelActive: {
    color: "#0055FF",
    fontWeight: "600",
  },
  contentArea: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
});
