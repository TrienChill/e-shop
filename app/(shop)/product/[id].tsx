//1. Thêm import router và useLocalSearchParams 
import { router, useLocalSearchParams } from 'expo-router';

//2. Thêm ActivityIndicator để hiển thị khi đang load dữ liệu
//3. Import supabase client
import { supabase } from '@/src/lib/supabase';

import { useCart } from '@/src/context/CartContext';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
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
// import { ColorOption, SizeOption } from '../../../src/types/types';

const {  height } = Dimensions.get('window');

// // --- Constants & Data ---
// const IMAGE_URL =
//   'https://lh3.googleusercontent.com/aida-public/AB6AXuAo-hALrVqlJt-f4pJmbjoRQGIqR7Hvn-6VQTYbc5VM_EoBVaw1xacsCNryH832RaeKO0VC0ymkjs9uJ9Adn-oVaKVTek6pm_HncG5kLG_I0O_0977tJdRkcI24KinUVdU8iWlImRI-bB4GCxKfBy6Jqxh54AXUdNBpIL90phTpVIaADhC0XQ7vtcR5SrU7oblt2njZWmMZPB_teV3kAW9quQcRQtlUtLLSSR9yXB9Bwt7Sz4mp7gvEVgdkDvdcun18HUl1mg-tuKA';

// const COLORS: ColorOption[] = [
//   { id: '1', name: 'Beige', hex: '#D2B48C' },
//   { id: '2', name: 'Black', hex: '#1a1a1a' },
//   { id: '3', name: 'Charcoal', hex: '#52525b' },
// ];

// const SIZES: SizeOption[] = [
//   { label: 'XS', available: true },
//   { label: 'S', available: true },
//   { label: 'M', available: true },
//   { label: 'L', available: true },
//   { label: 'XL', available: false },
// ];

// --- Components ---

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

const PaginationDots = () => (
  <View style={styles.paginationContainer}>
    <View style={[styles.dot, styles.activeDot]} />
    <View style={styles.dot} />
    <View style={styles.dot} />
    <View style={styles.dot} />
  </View>
);

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
  const { id } = useLocalSearchParams(); //Lấy id từ Url
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State cho lựa chọn (giữ nguyên logic)
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  const fetchProductDetail = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single(); // Lấy 1 sản phẩm duy nhất

      if (error) throw error;
      setProduct(data);
    
      // Tự động chọn size và màu sắc đầu tiên nếu có

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

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, selectedSize);
    router.push('/(shop)/(tabs)/cart');
  };

  // Nếu đang tải, hiện vòng xoay xoay
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  // Nếu không có sản phẩm, hiện thông báo
  if (!product) return <View><Text>Không có sản phẩm</Text></View>







  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Main Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Image Section */}
        <View style={styles.heroSection}>
          <Image source={{ uri: product.image ? product.image[0] : 'https://via.placeholder.com/400'  }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.overlayGradient} />
          
          <SafeAreaView style={styles.safeAreaHeader}>
            <Header />
          </SafeAreaView>

          <PaginationDots />
        </View>

        {/* Product Details Sheet */}
        <View style={styles.detailsSheet}>
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Title & Price */}
          <View style={styles.titleRow}>
            <Text style={styles.productTitle}>{product.name}</Text>
            <Text style={styles.priceText}>${product.price?.toLocaleString()} đ</Text>
          </View>

          {/* Ratings */}
          <View style={styles.ratingRow}>
            <Star fill="#EAB308" color="#EAB308" size={18} />
            <Text style={styles.ratingValue}>4.8</Text>
            <Text style={styles.ratingDot}>•</Text>
            <Text style={styles.ratingCount}>124 Reviews</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            {product.description || 'Chưa có mô tả cho sản phẩm này.'}
          </Text>

          {/* Colors */}
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
                      { backgroundColor: colorName.toLowerCase() }, // Lưu ý: Tên màu phải chuẩn tiếng Anh hoặc mã Hex thì mới hiện màu
                      isSelected && styles.colorCircleSelected,
                    ]}
                  >
                    {isSelected && <Check color="#fff" size={16} strokeWidth={3} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Sizes */}
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

          {/* AI Stylist Banner */}
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

          {/* Padding for bottom scroll */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky Footer */}
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

// --- Styles ---
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
    backgroundColor: 'rgba(0,0,0,0.05)', // Very subtle overlay
  },
  safeAreaHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
    backdropFilter: 'blur(10px)', // Note: This is web only, RN requires BlurView for real blur
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 48, // Lifted up to be visible above the sheet overlap
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
    marginTop: -32, // Negative margin for overlap
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
    borderColor: '#1a1a1a', // Outer ring simulated by gap or padding in real app, simplified here
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
    backgroundColor: '#F3E8FF', // Light purple bg
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 24, // Safe area for iPhone X+
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
