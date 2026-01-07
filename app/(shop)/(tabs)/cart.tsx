
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Types ---
interface Product {
  id: string;
  name: string;
  size: string;
  color: string;
  price: number;
  image: string;
  quantity: number;
  hasBadge?: boolean;
}

// --- Mock Data ---
const INITIAL_DATA: Product[] = [
  {
    id: '1',
    name: 'Oversized Wool Blazer',
    size: 'M',
    color: 'Beige',
    price: 120.00,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXOpQBIDi-leFeAIhLUomXo5zTlpAZzzeA0I8kdvOMwG5tOg4HSpjIzKQ73HtYOGH62DtIdZHTJX0op7EcunBoQTSkyNnvPdANxDP-eS6wusMy2S5SAH8Tn8oBmYe48im02qwfGwG1lozi97q9UMGIBL-twD_pGeUf7Hjq07y-7Q1SLVoDRsMNR3finCpXUpofqk-zFMpu5AYd61gbzPoD7luAMqV8m9yu7OXBDKRXH92-anmS5OGTBgFmSY6lEA0u2FvGJTjnRuE',
    quantity: 1,
    hasBadge: true,
  },
  {
    id: '2',
    name: 'Pleated Trousers',
    size: '32',
    color: 'Charcoal',
    price: 85.00,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBMa_KMlDH9gNOrn2RRbpx9tp0DzwUWvKvIuHjK6wnWRZQEylKiNxQ0AzcfNuJJPgFUobNvRGY6NwNLz7ntOpddAKGRxC89plVqjZXnsFbWYs-UZ0uSOaNY2nVYfpZGce-hy7XXiDF0zVsfBm6YeLFAsyqNnud9U1ykFCbkyYBsTpI8RkXxCjdD0IflYk5i14LAIefhQIAriCgj3DAcTTWHhpy7MKXMAzQvxMcTtqsBiv6OOg9ySmUNCmFcmJXF9bpfLpKjnGOfTY',
    quantity: 1,
  },
  {
    id: '3',
    name: 'Minimalist Sneakers',
    size: '42',
    color: 'White',
    price: 145.00,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZkpgdiIr19CF1u0Kh2WgVRbftc5X11zl1RC8mdIuCNHuyYojeOSWmgMQ8FsMMiOpF_0OcMoFxq-Sprtwty13psJIsERx9VxAuNhfOK041V5s5CZOLdX8jS7G76S9cxlJpSombQcfwmjPbas6P4HslzWr42ZQS_nVzcd5EaNOmUr4rqXwuVCxnU7idUlEAI7QkNWIJIqv8fx5mQUd7z-mOoJ2ni8hHr5wH1D3rIAu8ePN_9ki84nFdP7QRSULYTtcOW5SNhQTyIWE',
    quantity: 1,
  },
];

// --- Colors & Theme ---
const COLORS = {
  background: '#FFFFFF',
  backgroundLight: '#f7f7f7', // Slightly off-white for body
  primary: '#1a1a1a',
  textSecondary: '#737373',
  border: '#e5e5e5',
  purpleLight: '#faf5ff',
  purpleText: '#9333ea',
  green: '#16a34a',
  white: '#FFFFFF',
};

// --- Components ---

const CartItem = ({ item }: { item: Product }) => {
  return (
    <View style={styles.itemContainer}>
      {/* Image Section */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
      </View>

      {/* Details Section */}
      <View style={styles.itemDetails}>
        <View>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <TouchableOpacity style={styles.deleteButton}>
              <Trash2 size={20} color="#a3a3a3" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.itemMeta}>
            Size: {item.size} • Color: {item.color}
          </Text>

          {/* AI Badge */}
          {item.hasBadge && (
            <View style={styles.aiBadge}>
              <Sparkles size={14} color={COLORS.purpleText} style={{ marginRight: 4 }} />
              <Text style={styles.aiBadgeText}>Matches your style</Text>
            </View>
          )}
        </View>

        {/* Price & Quantity Stepper */}
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
          
          <View style={styles.stepperContainer}>
            <TouchableOpacity style={styles.stepperBtn}>
              <Minus size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity style={styles.stepperBtn}>
              <Plus size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const PromoCodeSection = () => (
  <View style={styles.promoContainer}>
    <Text style={styles.sectionTitle}>PROMO CODE</Text>
    <View style={styles.promoInputWrapper}>
      <TextInput 
        placeholder="Enter voucher code" 
        placeholderTextColor="#a3a3a3"
        style={styles.promoInput}
      />
      <TouchableOpacity style={styles.applyButton}>
        <Text style={styles.applyButtonText}>Apply</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const OrderSummary = ({ subtotal }: { subtotal: number }) => (
  <View style={styles.summaryContainer}>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Subtotal</Text>
      <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
    </View>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Shipping</Text>
      <Text style={[styles.summaryValue, { color: COLORS.green }]}>Free</Text>
    </View>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Discount</Text>
      <Text style={styles.summaryValue}>-$0.00</Text>
    </View>
  </View>
);

// --- Main App Component ---
export default function App() {
  const [items] = useState<Product[]>(INITIAL_DATA);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <ArrowLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bag ({items.length})</Text>
        <TouchableOpacity style={[styles.iconButton, styles.iconButtonLight]}>
          <Sparkles size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CartItem item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => (
            <>
              <View style={styles.divider} />
              <PromoCodeSection />
              <OrderSummary subtotal={subtotal} />
              {/* Padding for bottom fixed button */}
              <View style={{ height: 100 }} /> 
            </>
          )}
        />
      </KeyboardAvoidingView>

      {/* Fixed Bottom Action */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.checkoutButton} activeOpacity={0.9}>
          <Text style={styles.checkoutText}>Checkout</Text>
          <View style={styles.checkoutRight}>
            <Text style={styles.checkoutPrice}>${subtotal.toFixed(2)}</Text>
            <View style={styles.arrowCircle}>
              <ArrowRight size={20} color={COLORS.primary} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonLight: {
    backgroundColor: '#f5f5f5',
  },

  // List
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: COLORS.white,
  },

  // Cart Item
  itemContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 16,
  },
  imageWrapper: {
    width: 90,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  itemMeta: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purpleLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.purpleText,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  
  // Stepper
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 20,
    height: 36,
    paddingHorizontal: 4,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  quantityText: {
    width: 24,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginVertical: 32,
    width: '100%',
  },

  // Promo Code
  promoContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  promoInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 30, // Full rounded
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    height: 56,
  },
  promoInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    height: '100%',
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    height: 44,
    justifyContent: 'center',
  },
  applyButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },

  // Summary
  summaryContainer: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.9)', // Slight transparency
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24, // Safe area for iPhone X+
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    paddingLeft: 24,
    borderRadius: 100, // Full rounded
    height: 64,
  },
  checkoutText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  checkoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkoutPrice: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  arrowCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
