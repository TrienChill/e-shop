import { useRouter } from "expo-router";
import { Heart } from "lucide-react-native";
import React, { useState } from "react";
import {
    Image,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { PriceDisplay } from "@/src/components/common/PriceDisplay";

export interface PopularProductItem {
  id: string | number;
  image: string;
  price: number;
  name: string;
  badge?: string;
  badgeColor?: string;
  hasDiscount?: boolean;
  finalPrice?: number;
  originalPrice?: number;
}

interface PopularCardProps {
  item: PopularProductItem;
  style?: StyleProp<ViewStyle>;
}

export function PopularCard({ item, style }: PopularCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);

  return (
    <View style={[styles.popularCard, style]}>
      <TouchableOpacity
        onPress={() => router.push(`/(shop)/product/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.popularImageWrapper}>
          <Image source={{ uri: item.image }} style={styles.popularImage} />

          {/* Badge */}
          {item.badge && (
            <View
              style={[
                styles.badge,
                { backgroundColor: item.badgeColor || "#EF4444" },
              ]}
            >
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}

          {/* Heart/Wishlist Button */}
          <TouchableOpacity
            style={styles.heartBtn}
            activeOpacity={0.7}
            onPress={() => setLiked((p) => !p)}
          >
            <Heart
              size={14}
              color={liked ? "#EF4444" : "#6B7280"}
              fill={liked ? "#EF4444" : "transparent"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.infoContent}>
          <PriceDisplay
            hasDiscount={item.hasDiscount}
            finalPrice={item.finalPrice}
            originalPrice={item.originalPrice ?? item.price}
            size="sm"
          />
          <Text style={styles.popularName} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  popularCard: {
    width: "100%", // Flexible width to work with Grid/FlatList
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 4,
  },
  popularImageWrapper: {
    position: "relative",
    width: "100%",
    aspectRatio: 1, // Square image
    backgroundColor: "#F9FAFB",
  },
  popularImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  heartBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1,
  },
  infoContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  popularName: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
});

export default PopularCard;
