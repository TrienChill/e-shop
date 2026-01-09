import { supabase } from '@/src/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import {
    ArrowLeft,
    Heart,
    SlidersHorizontal,
    Sparkles
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
// 2. Thêm import useEffect, useState và ActivityIndicator
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
// 1. Thêm import router, useLocalSearchParams

// 3. Import supabase

// ... các import khác giữ nguyên ...

// --- Constants & Theme ---
const COLORS = {
  primary: '#1754cf',
  background: '#ffffff',
  backgroundLight: '#f6f6f8',
  textDark: '#111318',
  textLight: '#ffffff',
  gray: '#6b7280',
  border: '#e5e7eb',
};


const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2; // (Screen width - padding) / 2

// --- Mock Data ---
const PRODUCTS = [
  {
    id: 1,
    name: 'Oversized Wool Blazer',
    price: '$120.00',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBV7AHV4cZHL41218HvOg3hHF8KsoVasa8qFnczNq4zLuS6MVkofjbA0zVJoZVZICVfExy1Txt9vjtxJp2lw6YZKwENVKj0fqzaOj2KVwNtp8V44lpmLjS2_0PW1_O_Eecu05zIa4BOPfAMtZ5UWLsnJD_oOuszAw8263wKIEGGkyf8KZO0ThRwwbhg8jgxTAeCqcA7YpJZxhw0cPPL7tKaqR8UtsYVFFqoETbib4vSloAb210YaLStzL66qDxhI84CW-_heAszJi8',
    badge: 'NEW',
    aspectRatio: 3 / 4,
    isHot: false,
  },
  {
    id: 2,
    name: 'Satin Midi Skirt',
    price: '$85.00',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWNOvJnnKZQK2cN7QnIkmZMzoCR8l6UKTQeiiVndGFPCkxTEuBP6Q8FKsXxUfVvXvBHrv9Ce9rq7v6J9H3uibcbnKB0tg9OY9D7XIeh72pH70t0kCGDKQPYlU9B-ElFbSC_YxQ_qYe2Nl_1aXFMrRklQpQgh231dapHvR9489YZFBcBk3xfuUsWJ7XUzPU-4rzabHTSjcxfKhTu8tyUHzqmTqSysdcsBba36KLjLIYRTVdvN1EKmeK2Mxs-wnKlX1EuhygGv1UZBc',
    badge: 'HOT',
    aspectRatio: 3 / 5,
    isHot: true,
  },
  {
    id: 3,
    name: 'Classic Cotton Tee',
    price: '$45.00',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfniyJOynoi4TFc_igJq2ElGgBnof0gdWLxfputStHT4000Cn9oVitinIOKnVjuAzMkje_BU-M2x7dMsLsuKtnqdsABfC4piICKEVybcyewcsqi9u7CW-3B538yWIKC80w7muExqg6UrGDLaaVD4GZy-bsvUowkpq8xym5T4Asi5Va6j-AVkPWYgJihQvra61Yp6v-Mx4xUwZAqD65QcprvyF6RsGiRFLFeuVMOFDSG_08DahYCZp_w0qmGhIJigcAsKXLbJTZcHI',
    badge: 'NEW',
    aspectRatio: 1,
    isHot: false,
  },
  {
    id: 4,
    name: 'Pleated Trousers',
    price: '$95.00',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTd_tgR3JMgXKSQzapIxMYyEKekgdbRpurMBpc4xg4Khzq4buCd-253Lf_totN5ByLD6zc1YuPGbzLTWBL9fd-FWp5i90rVHPFzs4xAHMhgWXs6WKT50U4_TxezxEmZ7poMlOT_5PLNUdFhEC8Kpy5gfpa9XS9PYWRgDMF31zXjbulmMHGG7yjmMUk_OpQCxiDeTwpkJR5Br-rDvjrsgm7_QXz0ggnLZLExNPv3CPOtlUp525PfW_UYRx0kAQ_gh7RMCdJMymr_vM',
    badge: 'NEW',
    aspectRatio: 3 / 5,
    isHot: false,
  },
  {
    id: 5,
    name: 'Cashmere Sweater',
    price: '$150.00',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAK-DjGtj37FPZ8je_aihgtNYK9E2QMewTP35c-MMdK9iC9KcXzMBqEhP2D5qLvsbeq8uwX3cHy49vLpeED0_Si6HOEWaK1_dFCC02zuBiF07N3CCRXEWfH6rHMJOP6Avx68LKa0acActzEcE997HGiJVQdFqGN5_QhqOwwKcDoTVauCcbrMg0M6jGK5H6mWZJaJAsLfkWLbe4vzVIGdO94CjDS7tyV9H8B7JM9AN7rn4t3A2ruvIUwGnjQ3C1PrDkCOh_UqeNIykY',
    badge: 'NEW',
    aspectRatio: 4 / 5,
    isHot: false,
  },
  {
    id: 6,
    name: 'Leather Ankle Boots',
    price: '$210.00',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBz7G35arOuYnJAezbinRM0q7QCxYyzPiUIPBpQ1inOpxoVwm7_xIxQLXHb9vCq6ldD_Y3IzCu2hBUDwXRU0k7Ul6kd6N4I8MXU_RgGnnQ6X59ptoCjVBgR097QI8_WYLjG-55bf8cBtVdtIB_cT1I9wmtcPsj-ZhYDJx4EXWlBImu583CxPHtm_AXA7-CZKDuh-bZ6WFBn9yEGWnJeMxLErNq6Lj2s7b5Vf0K7zoXim-8l38GOAeGZ78gaposCcKLcPhkjRQvGAL4',
    badge: 'NEW',
    aspectRatio: 3 / 4,
    isHot: false,
  },
];

// --- Components ---

const ProductCard: React.FC<{ item: typeof PRODUCTS[0] }> = ({ item }) => (
  <TouchableOpacity activeOpacity={0.9} style={styles.cardContainer}
  onPress={() => router.push(`/product/${item.id}`)}
  >
    <View style={styles.imageContainer}>
      <Image
        source={{ uri: item.image }}
        style={[styles.productImage, { aspectRatio: item.aspectRatio }]}
        resizeMode="cover"
      />
      
      {/* Badge */}
      <View style={[
        styles.badge, 
        item.isHot ? styles.badgeHot : styles.badgeNew
      ]}>
        <Text style={[
          styles.badgeText,
          item.isHot ? styles.badgeTextHot : styles.badgeTextNew
        ]}>{item.badge}</Text>
      </View>

      {/* Wishlist Button */}
      <TouchableOpacity style={styles.wishlistButton}>
        <Heart size={20} color="#000" />
      </TouchableOpacity>
    </View>

    <View style={styles.productInfo}>
      <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.productPrice}>{item.price}</Text>
    </View>
  </TouchableOpacity>
);



export default function App() {
  // To simulate Masonry layout in React Native (since FlatList doesn't do masonry waterfall natively),
  // we split the data into two columns.


  const { id } = useLocalSearchParams(); // Lấy ID collection từ URL
  const [products, setProducts] = useState<any[]>([]);
  const [collectionName, setCollectionName] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollectionData();
  },[id]);


  const fetchCollectionData = async () => {
    if (!id) {
      setLoading(false);
      setCollectionName("Invalid Collection");
      return;
    }
    try {
      setLoading(true);
      // 1. Lấy dữ liệu category từ Supabase dựa trên id
      const { data: catData } = await supabase
        .from('categories')
        .select('name')
        .eq('id', id)
        .single();

      if (catData) {
        setCollectionName(catData.name);
      } else {
        setCollectionName("Collection Not Found");
      }

      // 2. Lấy sản phẩm trong category đó
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', id)
        .order('created_at', { ascending: false });

      if (prodData) {
        const mappedProducts = prodData.map((p) => ({
          id: p.id,
          name: p.name,
          price: `${p.price.toLocaleString()} đ`,
          image: p.images?.[0] || 'https://via.placeholder.com/300',
          badge: 'NEW',
          isHot: false,
          aspectRatio: 3 / 4,
        }));
        setProducts(mappedProducts);
      }
    } catch (error) {
      console.error('Error fetching collection data:', error);
      setCollectionName("Error");
    } finally {
      setLoading(false);
    }
  };

  // Chia cột Masonry từ dữ liệu thật
  const column1 = products.filter((_, i) => i % 2 === 0);
  const column2 = products.filter((_, i) => i % 2 !== 0);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{collectionName}</Text>
        
        <TouchableOpacity style={styles.iconButton}>
          <SlidersHorizontal size={24} color={COLORS.textDark} />
          <View style={styles.filterDot} />
        </TouchableOpacity>
      </View>

      {/* Body: Masonry ScrollView */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.masonryContainer}>
          {/* Column 1 */}
          <View style={styles.column}>
            {column1.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </View>
          
          {/* Column 2 */}
          <View style={styles.column}>
            {column2.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button: AI Stylist */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Sparkles size={20} color="#fff" />
        <Text style={styles.fabText}>AI Stylist</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    letterSpacing: -0.5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: '#fff',
  },

  // Layout Styles
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100, // Space for Navbar + FAB
  },
  masonryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: COLUMN_WIDTH,
    gap: 16, // Use gap for spacing between items in a column
  },

  // Card Styles
  cardContainer: {
    marginBottom: 0, // Handled by gap in column
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.backgroundLight,
  },
  productImage: {
    width: '100%',
    // Height is determined by aspect ratio dynamically
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeNew: {
    backgroundColor: '#fff',
  },
  badgeHot: {
    backgroundColor: COLORS.primary,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeTextNew: {
    color: '#000',
  },
  badgeTextHot: {
    color: '#fff',
  },
  wishlistButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    marginTop: 12,
    gap: 2,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // FAB Styles
  fab: {
    position: 'absolute',
    bottom: 96, // Above Nav Bar
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 20,
    gap: 8,
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // Bottom Nav Styles
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Safe area padding
    zIndex: 20,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 60,
  },
  navText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9ca3af',
  },
  navBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
});