// 1. Thêm useEffect, useState vào dòng import React
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';


// 2. Thêm import supabase (chỉnh đường dẫn cho đúng với dự án của bạn)
import { supabase } from '@/src/lib/supabase';
import { router } from 'expo-router';

// --- Types & Interfaces ---
interface Category {
  id: string;
  name: string;
  image: string;
}

interface Product {
  id: string;
  category: string;
  name: string;
  price: string;
  image: string;
  isNew?: boolean;
}

// // --- Data Mocking (URLs from HTML source) ---
const HERO_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeWBrILvGP3jf6iTmVsvweEvK6S3iyTxCc8u8Unu9JgXuEbB15FVa2wTdy5fWb-DRbumplRCyW5lAAhYiBjnHyZDHPZhyqvAduHQFWWegDsdpB6DDWetLyAAknGlwfQ1DeDFO6yefK3udUjD17Gtm0G1Z-BvSA4hsmYkpRvvlYYGPnoTWNpJzrqUQ3duxo3PvPNoAsvHXvKaP_UBjKJ5EE4qRYF7sx0x5Dpjdwq0vYWqOaZMb2hYUzm-LYUam_300Cm3GYkUkbGqM';



// --- Components ---

interface ProductCardProps {
  item: Product;
  heightRatio?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ item, heightRatio = 1.3 }) => (
  <TouchableOpacity style={styles.productCard}
  activeOpacity={0.7}  
  onPress={() => router.push(`/product/${item.id}`)}
  >
    <View style={[styles.productImageContainer, { aspectRatio: 1 / heightRatio }]}>
      <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
      {item.isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )}
      <TouchableOpacity style={styles.favoriteButton}>
        <MaterialIcons name="favorite-border" size={18} color="#1a1a1a" />
      </TouchableOpacity>
    </View>
    <View style={styles.productInfo}>
      <Text style={styles.productCategory}>{item.category}</Text>
      <Text style={styles.productName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.productPrice}>{item.price}</Text>
    </View>
  </TouchableOpacity>
);

const App = () => {


  // --- A. Khai báo biến chứa dữ liệu thật ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // THÊM DÒNG NÀY: Lấy sản phẩm mới nhất để hiển thị lên Banner
const [heroCollection, setHeroCollection] = useState<any>(null);
  // --- B. Hàm lấy dữ liệu từ Supabase ---
  useEffect(() => {
    const fetchData = async () => {
      // 1. Lấy danh mục
      const { data: cateData } = await supabase.from('categories').select('*');
      if (cateData) {
        // Map dữ liệu từ DB sang chuẩn giao diện
        setCategories(cateData.map((c: any) => ({
          id: c.id.toString(),
          name: c.name,
          image: c.image_url // DB là image_url, UI là image
        })));
      }

      // 2. Lấy sản phẩm (Kèm tên danh mục)
      const { data: prodData } = await supabase
        .from('products')
        .select('*, categories(name)') // Join bảng để lấy tên danh mục
        .order('created_at', { ascending: false });

      if (prodData) {
        setProducts(prodData.map((p: any) => ({
          id: p.id.toString(),
          category: p.categories?.name || 'Collection',
          name: p.name,
          price: `${p.price.toLocaleString()} đ`, // Format giá tiền
          image: p.images ? p.images[0] : '', // Lấy ảnh đầu tiên trong mảng
          isNew: true // Hoặc logic check ngày tạo mới
        })));
      }

      // 3. Lấy collection mới nhất cho Hero Section
      const { data: heroCatData } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (heroCatData) {
        setHeroCollection({
          id: heroCatData.id.toString(),
          name: heroCatData.name,
          image: heroCatData.image_url || HERO_IMAGE,
        });
      }


    };

    fetchData();
  }, []);

  // --- C. Chia sản phẩm thành 2 cột cho giao diện Masonry ---
  const productsCol1 = products.filter((_, i) => i % 2 === 0);
  const productsCol2 = products.filter((_, i) => i % 2 !== 0);

  // ... Phần return giữ nguyên ...
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="menu" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LUXE</Text>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="shopping-bag" size={28} color="#1a1a1a" />
          <View style={styles.cartBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <TouchableOpacity activeOpacity={0.9} 
            style={styles.heroImage}
            onPress={() => heroCollection && router.push(`/collection/${heroCollection.id}`)}
          >
            <ImageBackground
              // Logic: Nếu có sản phẩm thì lấy ảnh đó, chưa có thì dùng ảnh mặc định
              source={{ uri: heroCollection?.image || HERO_IMAGE }}
              style={styles.heroImage}
              imageStyle={{ borderRadius: 20 }}
            >
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Text style={styles.heroSubtitle}>LASTEST DROP</Text>
              {/* {Hiển thị tên Collection lấy từ DB} */}
              <Text style={styles.heroTitle}>{
                heroCollection ? heroCollection.name : 'New\nCollection'}</Text>
              <View style={styles.shopNowButton}>
                <Text style={styles.shopNowText}>SHOP NOW</Text>
              </View>
            </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* Categories Carousel */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.categoryItem}>
                <View style={styles.categoryImageContainer}>
                  <Image source={{ uri: item.image }} style={styles.categoryImage} />
                </View>
                <Text style={styles.categoryName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Recommended Grid */}
        <View style={styles.recommendedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.masonryContainer}>
            {/* Column 1 */}
            <View style={styles.column}>
              {productsCol1.map((item, index) => (
                <ProductCard key={item.id} item={item} heightRatio={index === 0 ? 1.33 : 1} />
              ))}
            </View>
            {/* Column 2 (Staggered top margin) */}
            <View style={[styles.column, styles.columnStaggered]}>
              {productsCol2.map((item, index) => (
                <ProductCard key={item.id} item={item} heightRatio={index === 0 ? 1.33 : 1.25} />
              ))}
            </View>
          </View>
        </View>

        {/* Newsletter */}
        <View style={styles.newsletterSection}>
          <View style={styles.newsletterCard}>
            <View style={styles.mailIconContainer}>
              <MaterialIcons name="mail-outline" size={24} color="#1a1a1a" />
            </View>
            <Text style={styles.newsletterTitle}>Join the Club</Text>
            <Text style={styles.newsletterSubtitle}>Get 10% off your first order.</Text>
            
            <View style={styles.inputRow}>
              <TextInput 
                placeholder="Email address" 
                placeholderTextColor="#9ca3af"
                style={styles.emailInput}
              />
              <TouchableOpacity style={styles.arrowButton}>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Padding for Bottom Nav */}
        <View style={{ height: 100 }} />
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 8,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // --- Hero Section ---
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 24,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 0.8, // 4/5 ratio
    overflow: 'hidden',
    borderRadius: 20,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)', // Gradient simulation
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    padding: 24,
    width: '100%',
    alignItems: 'flex-start',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 40,
    marginBottom: 16,
  },
  shopNowButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  shopNowText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // --- Categories ---
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 20,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  categoryImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  // --- Recommended ---
  recommendedSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // Align baseline
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888888',
    textDecorationLine: 'underline',
  },
  masonryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    gap: 24, // Vertical gap between items
  },
  columnStaggered: {
    marginLeft: 16, // Horizontal gap
    marginTop: 32, // Stagger effect
  },
  // Product Card Styles
  productCard: {
    width: '100%',
  },
  productImageContainer: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    zIndex: 10,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  productInfo: {
    paddingHorizontal: 4,
  },
  productCategory: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },

  // --- Newsletter ---
  newsletterSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  newsletterCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  mailIconContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 50,
    marginBottom: 16,
  },
  newsletterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  newsletterSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  emailInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  arrowButton: {
    backgroundColor: '#1a1a1a',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },


});

export default App;