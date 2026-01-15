// app/(shop)/product/[id].tsx

import { useCart } from '@/src/context/CartContext';
import { supabase } from '@/src/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  ShoppingBag,
  Sparkles,
  Star
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList, // 1. Thêm FlatList
  Image,
  NativeScrollEvent, // 2. Thêm Type cho sự kiện scroll
  NativeSyntheticEvent, // 3. Thêm Type cho sự kiện scroll
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// 4. Lấy thêm width để tính toán kích thước ảnh
const { width, height } = Dimensions.get('window');

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const BUCKET_NAME = 'product-imagess';

// --- Components ---

const getProductImage = (images: string[] | null | undefined): string[] => {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return ['https://via.placeholder.com/400'];
  }
  return images.map(img => {
    if (img.startsWith('http')) return img;
    return `${BASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${img}`;
  });
}

const Header = () => (
  <View style={styles.headerContainer}>
    <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
      <ArrowLeft color="#FFFFFF" size={24} />
    </TouchableOpacity>
    <TouchableOpacity style={styles.iconButton}>
      <Heart color="#FFFFFF" size={24} />
    </TouchableOpacity>
  </View>
);

// 5. Cập nhật PaginationDots để nhận props động
const PaginationDots = ({ total, activeIndex }: { total: number; activeIndex: number }) => {
  if (total <= 1) return null; // Ẩn nếu chỉ có 1 ảnh
  return (
    <View style={styles.paginationContainer}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === activeIndex && styles.activeDot // Highlight dot đang active
          ]}
        />
      ))}
    </View>
  );
};

const SectionTitle = ({ label, rightLabel }: { label: string; rightLabel?: string }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitleText}>{label}</Text>
    {rightLabel && (
      <TouchableOpacity>
        <Text style={styles.sizeGuideText}>{rightLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default function App() {
  const { id } = useLocalSearchParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 6. State theo dõi ảnh đang xem
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  const fetchProductDetail = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);
      
      if (data?.variants?.colors?.length > 0) setSelectedColor(data.variants.colors[0]);
      if (data?.variants?.sizes?.length > 0) setSelectedSize(data.variants.sizes[0]);
    } catch (error) {
      console.error('Lỗi lấy chi tiết:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProductDetail();
  }, [fetchProductDetail]);

  // 7. Hàm xử lý khi lướt xong 1 ảnh để cập nhật dot
  // Logic này đảm bảo khi hết hết 1 trang (width), index sẽ được cập nhật +1 hoặc -1
  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    // Tính index hiện tại dựa trên vị trí cuộn chia cho chiều rộng màn hình
    const currentIndex = Math.round(contentOffsetX / width);
    setActiveImageIndex(currentIndex);
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, selectedSize);
    router.push('/(shop)/(tabs)/cart');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!product) return <View><Text>Không có sản phẩm</Text></View>

  // Chuẩn bị list ảnh
  const productImages = getProductImage(product.images);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <SafeAreaView style={styles.safeAreaHeader}>
        <Header />
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Image Section - Đã thay đổi thành FlatList */}
        <View style={styles.heroSection}>
          <FlatList
            data={productImages}
            horizontal
            pagingEnabled // Quan trọng: Giúp lướt từng trang một
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            onMomentumScrollEnd={onMomentumScrollEnd} // Bắt sự kiện dừng cuộn
            renderItem={({ item }) => (
              <Image 
                source={{ uri: item }} 
                // Ảnh phải rộng bằng màn hình để lướt đúng 1 trang
                style={{ width: width, height: '100%' }} 
                resizeMode="cover" 
              />
            )}
          />
          
          {/* FIX: Thêm pointerEvents="none" để view này KHÔNG chặn thao tác vuốt của người dùng*/}
          <View style={styles.overlayGradient} pointerEvents="none" />
          
          {/* PaginationDots nhận props động */}
          <PaginationDots total={productImages.length} activeIndex={activeImageIndex} />
        </View>

        {/* Product Details Sheet */}
        <View style={styles.detailsSheet}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.productTitle}>{product.name}</Text>
            <Text style={styles.priceText}>${product.price?.toLocaleString()} đ</Text>
          </View>

          <View style={styles.ratingRow}>
            <Star fill="#EAB308" color="#EAB308" size={18} />
            <Text style={styles.ratingValue}>4.8</Text>
            <Text style={styles.ratingDot}>•</Text>
            <Text style={styles.ratingCount}>124 Reviews</Text>
          </View>

          <Text style={styles.description}>
            {product.description || 'Chưa có mô tả cho sản phẩm này.'}
          </Text>

          <View style={styles.section}>
            <SectionTitle label="Color" />
            <View style={styles.optionsRow}>
              {product.variants?.colors?.map((colorName: string, index: number) => {
                const isSelected = selectedColor === colorName;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedColor(colorName)}
                    style={[
                      styles.colorCircle, 
                      { backgroundColor: colorName.toLowerCase() },
                      isSelected && styles.colorCircleSelected,
                    ]}
                  >
                    {isSelected && <Check color="#fff" size={16} strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <SectionTitle label="Size" rightLabel="Size Guide" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sizeList}>
              {product.variants?.sizes?.map((sizeLabel: string, index: number) => {
                const isSelected = selectedSize === sizeLabel;
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setSelectedSize(sizeLabel)}
                    style={[
                      styles.sizePill,
                      isSelected && styles.sizePillSelected,
                    ]}
                  >
                    <Text style={[styles.sizeText, isSelected && styles.sizeTextSelected]}>{sizeLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.aiCard} activeOpacity={0.9}>
            <View style={styles.aiCardContent}>
              <View style={styles.aiIconContainer}>
                <Sparkles color="#9333EA" size={20} fill="#9333EA" style={{ opacity: 0.5 }} />
              </View>
              <View style={styles.aiTextContainer}>
                <Text style={styles.aiTitle}>Ask AI Stylist</Text>
                <Text style={styles.aiSubtitle}>How to style this fit for work?</Text>
              </View>
              <ChevronRight color="#9CA3AF" size={24} />
            </View>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>${product.price?.toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={styles.addToCartButton} activeOpacity={0.8} onPress={handleAddToCart}>
          <Text style={styles.addToCartText}>Add to Cart</Text>
          <ShoppingBag color="#FFF" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Giữ nguyên phần styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  
  // Hero Section
  heroSection: {
    height: height * 0.6,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  overlayGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)', 
  },
  safeAreaHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 48, 
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeDot: {
    width: 24,
    backgroundColor: '#FFF',
  },

  // Details Sheet
  detailsSheet: {
    flex: 1,
    marginTop: -32, 
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  dragHandle: {
    width: 48,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  
  // Product Info
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginRight: 16,
    lineHeight: 30,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 4,
  },
  ratingDot: {
    marginHorizontal: 8,
    color: '#9CA3AF',
  },
  ratingCount: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
    marginBottom: 32,
  },

  // Sections (Color/Size)
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sizeGuideText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  
  // Color Selectors
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#1a1a1a', 
  },

  // Size Selectors
  sizeList: {
    gap: 12,
    paddingRight: 24,
  },
  sizePill: {
    height: 40,
    minWidth: 48,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizePillSelected: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  sizePillDisabled: {
    borderColor: '#F3F4F6',
    backgroundColor: 'transparent',
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  sizeTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  sizeTextDisabled: {
    color: '#D1D5DB',
  },

  // AI Card
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F3E8FF', 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 24,
  },
  aiCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  aiTextContainer: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  aiSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24, 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  totalContainer: {
    flexDirection: 'column',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  addToCartButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#1a1a1a',
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});