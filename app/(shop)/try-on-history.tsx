import { CommonHeader } from "@/src/components/layout/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Màu sắc tiếng Việt
const colorTranslations: Record<string, string> = {
  Black: "Đen",
  White: "Trắng",
  Red: "Đỏ",
  Blue: "Xanh dương",
  Yellow: "Vàng",
  Green: "Xanh lá",
  Pink: "Hồng",
  Gray: "Xám",
  Orange: "Cam",
  Brown: "Nâu",
  Purple: "Tím",
};

interface TryOnHistoryItem {
  id: string;
  productImageUrl: string;
  resultUrl: string;
  productId?: string;
  productName?: string;
  selectedColor?: string;
}

export default function TryOnHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<TryOnHistoryItem[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await AsyncStorage.getItem("tryOnHistory");
      if (data) {
        setHistory(JSON.parse(data));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem("tryOnHistory");
      setHistory([]);
    } catch (e) {
      console.error(e);
    }
  };

  const renderItem = ({ item }: { item: TryOnHistoryItem }) => (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => item.productId && router.push(`/(shop)/product/${item.productId}`)}
    >
      <View style={styles.imageContainer}>
        {/* Ưu tiên hiển thị ảnh kết quả thử đồ to */}
        <Image
          source={{ uri: item.resultUrl }}
          style={styles.mainImage}
          resizeMode="cover"
        />
        {/* Ảnh sản phẩm gốc nhỏ góc phải */}
        <View style={styles.productThumbContainer}>
          <Image
            source={{ uri: item.productImageUrl }}
            style={styles.productThumb}
            resizeMode="cover"
          />
        </View>
      </View>
      
      {/* Thông tin sản phẩm ở ô bên phải */}
      <View style={styles.infoContainer}>
        <Text style={styles.productName} numberOfLines={3}>
          {item.productName || "Sản phẩm thời trang"}
        </Text>
        {item.selectedColor ? (
          <Text style={styles.colorText}>
            Màu: {colorTranslations[item.selectedColor] || item.selectedColor}
          </Text>
        ) : null}
        
        <View style={styles.actionButton}>
          <Text style={styles.actionText}>Xem sản phẩm</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <CommonHeader
        title="Đồ đã thử ảo"
        renderLeft={() => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
        )}
        renderRight={() => (
          <TouchableOpacity onPress={clearHistory} hitSlop={8}>
            <Trash2 size={22} color="#EF4444" />
          </TouchableOpacity>
        )}
      />

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Bạn chưa thử đồ ảo sản phẩm nào.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  imageContainer: {
    width: width * 0.45,
    height: width * 0.6,
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  productThumbContainer: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  productThumb: {
    width: "100%",
    height: "100%",
  },
  infoContainer: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
    lineHeight: 22,
  },
  colorText: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: "#EFF6FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  actionText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
  },
});
