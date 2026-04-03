import { getPopularProducts, calculateDiscountedPrice } from "@/src/services/product";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "expo-router";
import {
  Camera,
  Filter,
  Search as SearchIcon,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// --- Dữ liệu mặc định nếu lịch sử rỗng ---
const RECOMMENDATIONS = ["Chân váy", "Phụ kiện", "Áo thun đen", "Quần Jeans", "Giày trắng"];
const STORAGE_KEY = "search_history";



// Danh sách mẫu cho lịch sử và gợi ý

export default function SearchScreen() {
  const router = useRouter();
  const [searchPhrase, setSearchPhrase] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [discoverProducts, setDiscoverProducts] = useState<any[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  
  // Trạng thái cho Search thực tế
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  useEffect(() => {
    const initData = async () => {
      // Load sản phẩm phổ biến
      const popularData = await getPopularProducts();
      setDiscoverProducts(popularData);

      // Load lịch sử từ storage
      try {
        const storedHistory = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedHistory) {
          setHistory(JSON.parse(storedHistory));
        }
      } catch (err) {
        console.error("Lỗi khi load lịch sử:", err);
      }
    };
    initData();
  }, []);

  const saveHistory = async (newHistory: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (err) {
      console.error("Lỗi khi lưu lịch sử:", err);
    }
  };

  const addToHistory = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setHistory((prev) => {
      // Xóa nếu đã tồn tại để đưa lên đầu, và lọc các từ trùng
      const filtered = prev.filter((item) => item !== trimmedQuery);
      const updated = [trimmedQuery, ...filtered].slice(0, 10); // Lưu tối đa 10 từ
      saveHistory(updated);
      return updated;
    });
  };

  const deleteHistory = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    } catch (err) {
      console.error("Lỗi khi xóa lịch sử:", err);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setShowResults(true);
    setLoadingSearch(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_discounts (
            discounts (*)
          )
        `)
        .eq('is_active', true)
        // Sử dụng cột fts (Full-Text Search) với cấu hình 'simple' và loại 'websearch'
        // 'websearch' giúp xử lý an toàn các ký tự đặc biệt do người dùng nhập vào
        .textSearch('fts', query.trim(), { config: 'simple', type: 'websearch' });
      if (error) throw error;
      
      const processed = (data || []).map(calculateDiscountedPrice);
      setSearchResults(processed);
      addToHistory(query);
    } catch (err) {
      console.error("Lỗi khi tìm kiếm:", err);
    } finally {
      setLoadingSearch(false);
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
            onChangeText={setSearchPhrase}
            onSubmitEditing={() => performSearch(searchPhrase)}
            returnKeyType="search"
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
      {history.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lịch sử tìm kiếm</Text>
            <TouchableOpacity style={styles.trashBtn} onPress={deleteHistory}>
              <Trash2 size={18} color="#F87171" />
            </TouchableOpacity>
          </View>
          <View style={styles.tagWrapper}>
            {history.map((tag, idx) => (
              <TouchableOpacity key={idx} style={styles.tag} onPress={() => { setSearchPhrase(tag); performSearch(tag); }}>
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Gợi ý */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gợi ý cho bạn</Text>
        <View style={styles.tagWrapper}>
          {RECOMMENDATIONS.map((tag) => (
            <TouchableOpacity key={tag} style={styles.tag} onPress={() => { setSearchPhrase(tag); performSearch(tag); }}>
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
            <TouchableOpacity 
              key={product.id} 
              style={styles.discoverCard}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: `/(shop)/product/[id]`, params: { id: product.id } } as any)}
            >
              <Image source={{ uri: product.images?.[0] || 'https://via.placeholder.com/300' }} style={styles.discoverImg} />
              <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
              <Text style={styles.productPrice}>{(product.finalPrice || product.price || 0).toLocaleString('vi-VN')} đ</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );

  // --- Giao diện Kết quả tìm kiếm ---
  const renderResultsView = () => {
    if (loadingSearch) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 10, color: '#6B7280' }}>Đang tìm kiếm...</Text>
        </View>
      );
    }
    
    if (searchResults.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6B7280', fontSize: 16 }}>Không tìm thấy sản phẩm nào</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.resultCard}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: `/(shop)/product/[id]`, params: { id: item.id } } as any)}
          >
            <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300' }} style={styles.resultImg} />
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.productPrice}>{(item.finalPrice || item.price || 0).toLocaleString('vi-VN')} đ</Text>
          </TouchableOpacity>
        )}
      />
    );
  };

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