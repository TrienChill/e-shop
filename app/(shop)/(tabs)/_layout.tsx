import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }: any) {
  const onTabPress = (routeName: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeName,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const activeIndex = state.index;
  const routes = ['index', 'search', 'ai-chat', 'cart', 'profile'];

  return (
    <View style={styles.bottomNavContainer}>
      <View style={styles.bottomNav}>
        
        {/* Nút 1: HOME (index) */}
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => onTabPress(routes[0], activeIndex === 0)}
        >
          <View style={[styles.navIconWrapper, activeIndex === 0 && styles.navIconActive]}>
            <MaterialIcons name="home" size={24} color={activeIndex === 0 ? "#1a1a1a" : "#9ca3af"} />
          </View>
        </TouchableOpacity>
        
        {/* Nút 2: SEARCH */}
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => onTabPress(routes[1], activeIndex === 1)}
        >
          <View style={[styles.navIconWrapper, activeIndex === 1 && styles.navIconActive]}>
            <MaterialIcons name="search" size={24} color={activeIndex === 1 ? "#1a1a1a" : "#9ca3af"} />
          </View>
        </TouchableOpacity>

        {/* Nút 3: AI STYLIST (Nút to ở giữa) */}
        <TouchableOpacity 
          style={styles.aiButtonContainer}
          onPress={() => onTabPress(routes[2], activeIndex === 2)}
        >
          <View style={styles.aiButton}>
            <MaterialIcons name="auto-awesome" size={28} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Nút 4: CART */}
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => onTabPress(routes[3], activeIndex === 3)}
        >
          <View style={[styles.navIconWrapper, activeIndex === 3 && styles.navIconActive]}>
            <MaterialIcons name="shopping-cart" size={24} color={activeIndex === 3 ? "#1a1a1a" : "#9ca3af"} />
          </View>
        </TouchableOpacity>

        {/* Nút 5: PROFILE */}
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => onTabPress(routes[4], activeIndex === 4)}
        >
          <View style={[styles.navIconWrapper, activeIndex === 4 && styles.navIconActive]}>
            <MaterialIcons name="person-outline" size={24} color={activeIndex === 4 ? "#1a1a1a" : "#9ca3af"} />
          </View>
        </TouchableOpacity>

      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="ai-chat" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bottomNavContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: Math.min(width - 32, 400),
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapper: {
    padding: 8,
    borderRadius: 20,
  },
  navIconActive: {
    backgroundColor: 'rgba(26, 26, 26, 0.05)',
  },
  aiButtonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
  },
  aiButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});