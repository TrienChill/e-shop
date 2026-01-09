import { useCart } from '@/src/context/CartContext';
import { CartItem as CartItemType } from '@/src/types/types';
import { router } from 'expo-router';
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
  Alert,
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

const CartItem = ({ item }: { item: CartItemType }) => {
  const { updateItemQuantity, removeItem } = useCart();
  return (
    <View style={styles.itemContainer}>
      {/* Image Section */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.product.image }} style={styles.itemImage} resizeMode="cover" />
      </View>

      {/* Details Section */}
      <View style={styles.itemDetails}>
        <View>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={1}>{item.product.name}</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={() => removeItem(item.id)}>
              <Trash2 size={20} color="#a3a3a3" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.itemMeta}>
            Size: {item.size}
          </Text>
        </View>

        {/* Price & Quantity Stepper */}
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>vnđ{item.product.price.toFixed(2)}</Text>
          
          <View style={styles.stepperContainer}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => updateItemQuantity(item.id, -1)}>
              <Minus size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => updateItemQuantity(item.id, 1)}>
              <Plus size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const PromoCodeSection = () => {
  const { applyDiscount } = useCart();
  const [promoCode, setPromoCode] = useState('');

  const handleApply = () => {
    if (applyDiscount(promoCode)) {
      Alert.alert('Success', 'Promo code applied!');
    } else {
      Alert.alert('Error', 'Invalid promo code.');
    }
  };

  return (
  <View style={styles.promoContainer}>
    <Text style={styles.sectionTitle}>PROMO CODE</Text>
    <View style={styles.promoInputWrapper}>
      <TextInput 
        placeholder="Enter voucher code" 
        placeholderTextColor="#a3a3a3"
        style={styles.promoInput}
        value={promoCode}
        onChangeText={setPromoCode}
      />
      <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
        <Text style={styles.applyButtonText}>Apply</Text>
      </TouchableOpacity>
    </View>
  </View>
  )
};

const OrderSummary = () => {
  const { subtotal, discount } = useCart();
  return (
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
        <Text style={styles.summaryValue}>-${discount.toFixed(2)}</Text>
      </View>
    </View>
  );
}

// --- Main App Component ---
export default function CartScreen() {
  const { items, total, subtotal } = useCart();

  if (items.length === 0) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                    <ArrowLeft size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Bag (0)</Text>
                <View style={{width: 40}} />
            </View>
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <Text style={{fontSize: 18, color: COLORS.textSecondary}}>Your cart is empty</Text>
            </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
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
              <OrderSummary />
              {/* Padding for bottom fixed button */}
              <View style={{ height: 120 }} /> 
            </>
          )}
        />
      </KeyboardAvoidingView>

      {/* Fixed Bottom Action */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.checkoutButton} activeOpacity={0.9} onPress={() => router.push('/(shop)/checkout')}>
          <Text style={styles.checkoutText}>Checkout</Text>
          <View style={styles.checkoutRight}>
            <Text style={styles.checkoutPrice}>${total.toFixed(2)}</Text>
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
    zIndex: 1000, // Đảm bảo luôn nằm trên cùng
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
