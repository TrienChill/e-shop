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

const { width: STATIC_WIDTH } = Dimensions.get("window");

function CustomTabBar({ state, descriptors, navigation }: any) {
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

  return (
    <View style={styles.bottomNavContainer}>
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
          setCartCount(0);
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

  return (
    <View style={styles.container}>
      {isWeb && <WebHeader cartCount={cartCount} />}

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomNavContainer: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 35,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 16,
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#0055FF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
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
    backgroundColor: "rgba(0, 85, 255, 0.1)",
  },
});
