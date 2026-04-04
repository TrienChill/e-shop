import React from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";

interface RecentlyViewedItem {
  id: string | number;
  image: string;
  [key: string]: any;
}

interface RecentlyViewedSectionProps {
  items: RecentlyViewedItem[];
  title?: string;
  onPressSeeAll?: () => void;
  emptyText?: string;
}

const COLOR = {
  blue: "#0055FF",
  white: "#FFFFFF",
  textSecondary: "#666666",
  dark: "#1A1A1A",
};

export const RecentlyViewedSection: React.FC<RecentlyViewedSectionProps> = ({
  items,
  title = "Đã xem gần đây",
  onPressSeeAll,
  emptyText = "Duyệt sản phẩm để lưu lịch sử",
}) => {
  const router = useRouter();

  const getProductImageUrl = (path: string | null) => {
    if (!path) return "https://via.placeholder.com/150";
    if (path.startsWith("http")) return path;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/product-images/${path}`;
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onPressSeeAll && (
          <TouchableOpacity 
            style={styles.circleBtnActive} 
            onPress={onPressSeeAll}
            activeOpacity={0.7}
          >
            <ArrowRight size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {items && items.length > 0 ? (
          items.map((item, index) => (
            <TouchableOpacity
              key={`${item.id}-${index}`}
              style={styles.recentViewedItemContainer}
              activeOpacity={0.8}
              onPress={() => router.push(`/(shop)/product/${item.id}` as any)}
            >
              <View style={styles.recentViewedItem}>
                <Image
                  source={{ uri: getProductImageUrl(item.image) }}
                  style={styles.recentViewedImage}
                />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>{emptyText}</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLOR.dark,
    letterSpacing: -0.5,
  },
  circleBtnActive: {
    backgroundColor: COLOR.blue,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  horizontalScroll: {
    gap: 16,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 10,
  },
  recentViewedItemContainer: {
    padding: 4,
  },
  recentViewedItem: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLOR.white,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
    borderWidth: 4,
    borderColor: COLOR.white,
  },
  recentViewedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
  },
  emptyText: {
    color: COLOR.textSecondary,
    fontSize: 14,
    paddingLeft: 20,
  },
});

export default RecentlyViewedSection;
