import {
  Camera,
  Filter,
  Search as SearchIcon,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { getPopularProducts } from "@/src/services/product";
import {
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// --- Dữ liệu giả định (Mock Data) ---
const SEARCH_HISTORY = ["Váy đỏ", "Kính râm", "Quần màu Mustard", "Chân váy 80s"];
const RECOMMENDATIONS = ["Chân váy", "Phụ kiện", "Áo thun đen", "Quần Jeans", "Giày trắng"];



const SEARCH_RESULTS = [
  { id: "101", name: "Tất len lông cừu hiện đại", price: 170000, image: "https://images.unsplash.com/photo-1582966298430-817810c95f3b?w=400" },
  { id: "102", name: "Tất Cotton cao cấp", price: 170000, image: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400" },
  { id: "103", name: "Tất thể thao năng động", price: 170000, image: "https://images.unsplash.com/photo-1544648193-c51f456e94bc?w=400" },
  { id: "104", name: "Tất nhiệt mùa đông", price: 175000, image: "https://images.unsplash.com/photo-1582966298430-817810c95f3b?w=400" },
  { id: "105", name: "Tất thường ngày phong cách", price: 170000, image: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400" },
  { id: "106", name: "Tất lụa mềm mại", price: 190000, image: "https://images.unsplash.com/photo-1544648193-c51f456e94bc?w=400" },
];

export default function SearchScreen() {
  const [searchPhrase, setSearchPhrase] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [discoverProducts, setDiscoverProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchPopular = async () => {
      const data = await getPopularProducts();
      setDiscoverProducts(data);
    };
    fetchPopular();
  }, []);

  // Hàm xử lý tìm kiếm
  const handleSearch = (text: string) => {
    setSearchPhrase(text);
    if (text.length > 0) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  // Hàm xóa nội dung tìm kiếm
  const clearSearch = () => {
    setSearchPhrase("");
    setShowResults(false);
    Keyboard.dismiss();
  };

  // --- Header ---
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{showResults ? "Cửa hàng" : "Tìm kiếm"}</Text>
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          {!showResults && <SearchIcon size={20} color="#9CA3AF" style={{ marginRight: 10 }} />}
          {showResults && (
            <View style={styles.searchChip}>
              <Text style={styles.searchChipText}>{searchPhrase}</Text>
              <TouchableOpacity onPress={clearSearch}>
                <X size={14} color="#3B82F6" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={[styles.input, showResults && { width: 0, opacity: 0 }]}
            placeholder="Tìm kiếm sản phẩm..."
            placeholderTextColor="#9CA3AF"
            value={searchPhrase}
            onChangeText={handleSearch}
          />
          <TouchableOpacity>
            <Camera size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        {showResults && (
          <TouchableOpacity style={styles.filterBtn}>
            <Filter size={20} color="#000" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // --- Giao diện Tìm kiếm ban đầu ---
  const renderInitialView = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Lịch sử tìm kiếm */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lịch sử tìm kiếm</Text>
          <TouchableOpacity style={styles.trashBtn}>
            <Trash2 size={18} color="#F87171" />
          </TouchableOpacity>
        </View>
        <View style={styles.tagWrapper}>
          {SEARCH_HISTORY.map((tag) => (
            <TouchableOpacity key={tag} style={styles.tag} onPress={() => handleSearch(tag)}>
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Gợi ý */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gợi ý cho bạn</Text>
        <View style={styles.tagWrapper}>
          {RECOMMENDATIONS.map((tag) => (
            <TouchableOpacity key={tag} style={styles.tag} onPress={() => handleSearch(tag)}>
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Khám phá */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontSize: 22, fontWeight: '800', marginBottom: 20 }]}>Khám phá</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {discoverProducts.map((product) => (
            <View key={product.id} style={styles.discoverCard}>
              <Image source={{ uri: product.images?.[0] || 'https://via.placeholder.com/300' }} style={styles.discoverImg} />
              <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
              <Text style={styles.productPrice}>{(product.finalPrice || product.price || 0).toLocaleString('vi-VN')} đ</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );

  // --- Giao diện Kết quả tìm kiếm ---
  const renderResultsView = () => (
    <FlatList
      data={SEARCH_RESULTS}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.gridContainer}
      renderItem={({ item }) => (
        <View style={styles.resultCard}>
          <Image source={{ uri: item.image }} style={styles.resultImg} />
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>{item.price.toLocaleString('vi-VN')} đ</Text>
        </View>
      )}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {showResults ? renderResultsView() : renderInitialView()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#000",
    marginBottom: 15,
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    height: 44,
    backgroundColor: "#F5F5F5",
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  searchChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 10,
  },
  searchChipText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "700",
    marginRight: 6,
  },
  filterBtn: {
    marginLeft: 15,
  },

  // Phần tiêu đề (Sections)
  section: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  trashBtn: {
    padding: 5,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
  },
  tagWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tag: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },

  // Phần khám phá (Discover)
  discoverCard: {
    width: 140,
    marginRight: 20,
  },
  discoverImg: {
    width: 140,
    height: 160,
    borderRadius: 18,
    marginBottom: 10,
    backgroundColor: "#F5F5F5",
  },
  productName: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: "#000",
  },

  // Phần kết quả (Results)
  gridContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  resultCard: {
    flex: 1,
    margin: 5,
    marginBottom: 20,
  },
  resultImg: {
    width: "100%",
    aspectRatio: 0.85,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor: "#F5F5F5",
  },
});