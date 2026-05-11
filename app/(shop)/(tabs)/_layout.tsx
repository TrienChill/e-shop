import { MaterialIcons } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { supabase } from "@/src/lib/supabase";
import WebHeader from "@/src/components/web/WebHeader";
import WebFooter from "@/src/components/web/WebFooter";
import { ScrollView } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: STATIC_WIDTH } = Dimensions.get("window");

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "web") return null;

  if (state.routes[state.index].name === "cart") return null;

  const onTabPress = (routeName: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: "tabPress",
      target: routeName,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const activeIndex = state.index;
  const routes = ["index", "categories", "wishlist", "profile"];
  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <View style={[styles.bottomNavContainer, { bottom: bottomPadding }]}>
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => onTabPress(routes[0], state.routeNames[activeIndex] === routes[0])}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconWrapper, state.routeNames[activeIndex] === routes[0] && styles.navIconActive]}>
              <MaterialIcons
                name="home"
                size={26}
                color={state.routeNames[activeIndex] === routes[0] ? "#0055FF" : "#9ca3af"}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => onTabPress(routes[1], state.routeNames[activeIndex] === routes[1])}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconWrapper, state.routeNames[activeIndex] === routes[1] && styles.navIconActive]}>
              <MaterialIcons
                name="grid-view"
                size={26}
                color={state.routeNames[activeIndex] === routes[1] ? "#0055FF" : "#9ca3af"}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => onTabPress(routes[2], state.routeNames[activeIndex] === routes[2])}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconWrapper, state.routeNames[activeIndex] === routes[2] && styles.navIconActive]}>
              <MaterialIcons
                name="favorite-border"
                size={26}
                color={state.routeNames[activeIndex] === routes[2] ? "#0055FF" : "#9ca3af"}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => onTabPress(routes[3], state.routeNames[activeIndex] === routes[3])}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconWrapper, state.routeNames[activeIndex] === routes[3] && styles.navIconActive]}>
              <MaterialIcons
                name="person-outline"
                size={26}
                color={state.routeNames[activeIndex] === routes[3] ? "#0055FF" : "#9ca3af"}
              />
            </View>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isWeb = Platform.OS === "web";
  const isWebDesktop = isWeb && width >= 1024;
  const [cartCount, setCartCount] = useState(0);

  // On web desktop, hide bottom tabs when on account pages
  const isAccountRoute = pathname === "/(shop)/(tabs)/profile" ||
    pathname === "/(shop)/(tabs)/wishlist";

  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          // Guest: đọc số lượng từ AsyncStorage
          const { getGuestCart } = await import("@/src/services/guestCart");
          const guestCart = await getGuestCart();
          const guestTotal = guestCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
          setCartCount(guestTotal);
          return;
        }

        const { data, error } = await supabase
          .from("cart_items")
          .select("quantity")
          .eq("user_id", user.id);

        if (error) throw error;

        const total = (data || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
        setCartCount(total);
      } catch (error) {
        console.error("Lỗi lấy số lượng giỏ hàng:", error);
      }
    };

    fetchCartCount();
  }, []);

  const Container = isWebDesktop ? ScrollView : View;

  return (
    <Container 
      style={styles.container} 
      contentContainerStyle={isWebDesktop ? { flexGrow: 1 } : undefined}
    >
      {isWeb && <WebHeader cartCount={cartCount} />}

      <View style={isWebDesktop ? { flex: 1, minHeight: Dimensions.get('window').height } : { flex: 1 }}>
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false,
            tabBarStyle: {
              display: isWeb ? "none" : "flex",
              position: "absolute",
              backgroundColor: "transparent",
              borderTopWidth: 0,
              elevation: 0,
            },
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="categories" />
          <Tabs.Screen name="wishlist" />
          <Tabs.Screen
            name="profile"
            options={{
              href: isWebDesktop ? "/(shop)/(account)/profile" : "/(shop)/(tabs)/profile",
            }}
          />
          <Tabs.Screen name="search" options={{ href: null }} />
          <Tabs.Screen name="ai-chat" options={{ href: null }} />
          <Tabs.Screen name="cart" options={{ href: null }} />
        </Tabs>
      </View>
      
      <WebFooter />
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomNavContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  blurContainer: {
    borderRadius: 35,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconWrapper: {
    padding: 12,
    borderRadius: 20,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  navIconActive: {
    backgroundColor: "rgba(0, 85, 255, 0.15)",
  },
});
