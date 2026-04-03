import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ChevronRight, Search, ShoppingBag } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/src/lib/supabase";

interface Category {
  id: number;
  name: string;
  name_vi: string;
  image_url: string | null;
  parent_id: number | null;
  display_order: number;
}

export default function CategoriesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setAllCategories(data || []);
    } catch (error) {
      console.error("Lỗi lấy danh mục:", error);
    } finally {
      setLoading(false);
    }
  };

  // Lọc danh mục cha (parent_id is null)
  const parentCategories = allCategories.filter(cat => cat.parent_id === null);
  
  // Lọc danh mục con dựa trên danh mục cha đang chọn hoặc tìm kiếm
  const displayCategories = searchQuery.trim() !== "" 
    ? allCategories.filter(cat => 
        (cat.name_vi || cat.name).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : selectedParentId 
      ? allCategories.filter(cat => cat.parent_id === selectedParentId)
      : parentCategories;

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const isParent = item.parent_id === null && searchQuery === "";

    return (
      <TouchableOpacity
        style={[styles.categoryCard, !isParent && styles.subCategoryCard]}
        activeOpacity={0.7}
        onPress={() => {
          if (isParent) {
            setSelectedParentId(item.id);
          } else {
            // Điều hướng tới danh sách sản phẩm theo category
            router.push({
              pathname: "/(shop)/search",
              params: { categoryId: item.id, categoryName: item.name_vi || item.name }
            } as any);
          }
        }}
      >
        <View style={styles.cardContent}>
          <Image
            source={{ uri: item.image_url || "https://via.placeholder.com/150" }}
            style={isParent ? styles.categoryImage : styles.subCategoryImage}
          />
          <View style={styles.textContainer}>
            <Text style={styles.categoryName}>{item.name_vi || item.name}</Text>
            {isParent && <Text style={styles.itemCount}>Khám phá ngay</Text>}
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Danh mục</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => router.push("/(shop)/search" as any)} style={styles.iconBtn}>
            <Search size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(shop)/cart" as any)} style={styles.iconBtn}>
            <ShoppingBag size={24} color="#000" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>0</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Tìm nhanh danh mục..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text === "") setSelectedParentId(null);
            }}
          />
        </View>
      </View>

      {/* Breadcrumb / Back Navigation if viewing subcategories */}
      {selectedParentId && searchQuery === "" && (
        <TouchableOpacity 
          style={styles.backBreadcrumb}
          onPress={() => setSelectedParentId(null)}
        >
          <MaterialIcons name="arrow-back" size={20} color="#0055FF" />
          <Text style={styles.backText}>Quay lại danh mục chính</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0055FF" />
        </View>
      ) : (
        <FlatList
          data={displayCategories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          numColumns={selectedParentId || searchQuery ? 2 : 1}
          key={selectedParentId || searchQuery ? "grid" : "list"}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không tìm thấy danh mục nào</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#000",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    marginLeft: 20,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF3B30",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 45,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#000",
  },
  backBreadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  backText: {
    marginLeft: 8,
    color: "#0055FF",
    fontWeight: "600",
    fontSize: 15,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 15,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  subCategoryCard: {
    flex: 0.5,
    marginHorizontal: 5,
    alignItems: "center",
    paddingVertical: 20,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F3F4F6",
  },
  subCategoryImage: {
    width: 80,
    height: 80,
    borderRadius: 15,
    marginBottom: 10,
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  itemCount: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: "center",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 16,
  },
});
