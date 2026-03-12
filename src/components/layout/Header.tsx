import React from "react";
import { Platform, StatusBar, StyleSheet, View, ViewStyle } from "react-native";

interface CommonHeaderProps {
  children?: React.ReactNode;
  renderLeft?: () => React.ReactNode;
  renderRight?: () => React.ReactNode;
  containerStyle?: ViewStyle;
}

/**
 * Common Header component used across different screens.
 * Following the design from Profile screen.
 */
export const CommonHeader: React.FC<CommonHeaderProps> = ({
  renderLeft,
  renderRight,
  containerStyle,
}) => {
  return (
    <View style={[styles.headerContainer, containerStyle]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>{renderLeft?.()}</View>
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
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});

export default CommonHeader;
