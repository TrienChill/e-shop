import React from "react";
import { StyleSheet, View, ViewStyle, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CommonHeaderProps {
  children?: React.ReactNode;
  title?: string;
  renderLeft?: () => React.ReactNode;
  renderRight?: () => React.ReactNode;
  containerStyle?: ViewStyle;
}

/**
 * Common Header component used across different screens.
 * Following the design from Profile screen.
 */
export const CommonHeader: React.FC<CommonHeaderProps> = ({
  title,
  renderLeft,
  renderRight,
  containerStyle,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: insets.top + 5 }, // Thêm một chút padding sau khi tính safe area
        containerStyle,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>{renderLeft?.()}</View>
        {title && (
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
        )}
        <View style={styles.headerRight}>{renderRight?.()}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 10,
    zIndex: 10,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    // Elevation for Android
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'flex-end',
    gap: 12,
    flex: 1,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  }
});

export default CommonHeader;
