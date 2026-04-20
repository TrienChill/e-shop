import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, usePathname, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface WebHeaderProps {
  cartCount?: number;
}

export default function WebHeader({ cartCount = 0 }: WebHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (q) {
      setSearchQuery(q);
    }
  }, [q]);

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname?.startsWith(path)) return true;
    return false;
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/(shop)/(tabs)/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navItems = [
    { path: "/", label: "Trang chủ", icon: "home" },
    { path: "/(shop)/(tabs)/wishlist", label: "Yêu thích", icon: "favorite-border" },
    { path: "/(shop)/(tabs)/cart", label: "Giỏ hàng", icon: "shopping-bag", hasBadge: true },
    { path: "/(shop)/(tabs)/profile", label: "Tài khoản", icon: "person-outline" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        {/* Logo */}
        <Pressable onPress={() => router.push("/")} style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Text style={styles.logoText}>E-SHOP</Text>
          </View>
        </Pressable>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable style={styles.cameraButton}>
            <MaterialIcons name="camera-alt" size={20} color="#6B7280" />
          </Pressable>
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <MaterialIcons name="search" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Navigation Icons */}
        <View style={styles.navContainer}>
          {navItems.map((item) => (
            <Pressable
              key={item.path}
              style={[
                styles.navItem,
                isActive(item.path) && styles.navItemActive,
              ]}
              onPress={() => router.push(item.path as any)}
            >
              <View style={styles.navIconWrapper}>
                <MaterialIcons
                  name={item.icon as any}
                  size={24}
                  color={isActive(item.path) ? "#0055FF" : "#6B7280"}
                />
                {item.hasBadge && cartCount > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>
                      {cartCount > 99 ? "99+" : cartCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.navLabel,
                  isActive(item.path) && styles.navLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  innerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 72,
    paddingHorizontal: 40,
    maxWidth: SCREEN_WIDTH > 1400 ? 1400 : "100%",
    alignSelf: "center",
    width: "100%",
  },
  logoContainer: {
    flexShrink: 0,
  },
  logoWrapper: {
    backgroundColor: "#0055FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 60,
    maxWidth: 600,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F3F4F6",
    borderRadius: 22,
    paddingLeft: 20,
    paddingRight: 40, // Space for the camera icon
    fontSize: 15,
    color: "#1F2937",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  cameraButton: {
    position: 'absolute',
    right: 54, // Positioned inside the input, before the search button
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: "#0055FF",
    borderRadius: 22,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  navContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    transitionProperty: "background-color",
  },
  navItemActive: {
    backgroundColor: "#EEF2FF",
  },
  navIconWrapper: {
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    marginTop: 4,
  },
  navLabelActive: {
    color: "#0055FF",
    fontWeight: "600",
  },
});
