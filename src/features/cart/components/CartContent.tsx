import { useSupabaseRealtime } from "@/src/services/useSupabaseRealtime";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { addToGuestCart, getGuestCart, removeFromGuestCart, updateGuestCartQuantity } from "@/src/services/guestCart";
import {
  Check,
  X as CloseIcon,
  Minus,
  Plus,
  ShoppingBag,
  Trash2
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import {
  PopularCard,
  PopularProductItem,
} from "@/src/components/card/PopularCard";
import { PriceDisplay } from "@/src/components/common/PriceDisplay";
import { supabase } from "@/src/lib/supabase";
import {
  calculateDiscountedPrice,
  COLOR_TRANSLATIONS,
  getProductImageByColor,
} from "@/src/services/product";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CartItem {
  id: string;
  name: string;
  size: string;
  color: string;
  price: number;
  image: string;
  quantity: number;
  /** Giá gốc (trước giảm giá) */
  originalPrice: number;
  /** Giá sau khi giảm */
  finalPrice: number;
  /** Có đang áp dụng giảm giá không */
  hasDiscount: boolean;
}

interface WishlistItem {
  id: string; // ID của dòng wishlist trong DB
  product_id: string | number;
  name: string;
  price: number;
  originalPrice: number;
  hasDiscount: boolean;
  color: string;
  size: string;
  image: string;
}

const C = {
  bg: "#FFFFFF",
  text: "#111827",
  sub: "#6B7280",
  border: "#E5E7EB",
  bg2: "#F3F4F6",
  blue: "#2563EB",
  white: "#FFFFFF",
};

// ─── Cart Item Row ─────────────────────────────────────────────────────────────
const CartItemRow = ({
  item,
  onIncrease,
  onDecrease,
  isSelected,
  onToggleSelect,
  onDelete,
}: {
  item: CartItem;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) => (
  <View style={styles.cartRow}>
    {/* Image */}
    <View style={styles.cartImageWrap}>
      <Image
        source={{ uri: item.image || "https://via.placeholder.com/200" }}
        style={styles.cartImage}
        resizeMode="cover"
      />
      {/* Nút Xóa nằm trên ảnh giống wishlist */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(item.id)}
        activeOpacity={0.7}
      >
        <Trash2 size={16} color={C.sub} />
      </TouchableOpacity>
    </View>

    {/* Details */}
    <View style={styles.cartDetails}>
      <Text style={styles.cartName} numberOfLines={2}>
        {item.name}
      </Text>

      {/* Giá: dùng PriceDisplay để hiển thị giảm giá nếu có */}
      <PriceDisplay
        hasDiscount={item.hasDiscount}
        finalPrice={item.finalPrice}
        originalPrice={item.originalPrice}
        size="sm"
      />

      {/* Color + Size tags */}
      <View style={styles.tagsRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.color}</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.size}</Text>
        </View>
      </View>

      {/* Stepper */}
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onDecrease(item.id)}
          disabled={item.quantity <= 1}
        >
          <Minus size={16} color={item.quantity <= 1 ? "#D1D5DB" : C.blue} />
        </TouchableOpacity>
        <Text style={styles.qty}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onIncrease(item.id)}
        >
          <Plus size={16} color={C.blue} />
        </TouchableOpacity>
      </View>
    </View>

    {/* ── Checkbox tích chọn (bên phải) ── */}
    <TouchableOpacity
      style={[styles.checkbox, isSelected && styles.checkboxChecked]}
      onPress={() => onToggleSelect(item.id)}
      activeOpacity={0.7}
    >
      {isSelected && <Check size={13} color="#fff" strokeWidth={3} />}
    </TouchableOpacity>
  </View>
);

// ─── Wishlist Row ──────────────────────────────────────────────────────────────
const WishlistRow = ({
  item,
  onAddToCart,
}: {
  item: WishlistItem;
  onAddToCart: (item: WishlistItem) => void;
}) => (
  <View style={styles.cartRow}>
    {/* Image + delete */}
    <View style={styles.cartImageWrap}>
      <Image
        source={{ uri: item.image }}
        style={styles.cartImage}
        resizeMode="cover"
      />
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('wishlist').delete().eq('id', item.id);
          }
        }}
      >
        <Trash2 size={16} color={C.sub} />
      </TouchableOpacity>
    </View>

    {/* Details */}
    <View style={styles.cartDetails}>
      <Text style={styles.cartName} numberOfLines={2}>
        {item.name}
      </Text>
      <PriceDisplay
        hasDiscount={item.hasDiscount}
        finalPrice={item.price}
        originalPrice={item.originalPrice}
        size="sm"
      />

      {/* Add to cart button only (Tags removed as per request) */}
      <View style={[styles.wishlistBottom, { justifyContent: 'flex-end' }]}>
        <TouchableOpacity
          style={styles.addCartBtn}
          onPress={() => onAddToCart(item)}
        >
          <ShoppingBag size={18} color={C.blue} />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// ─── Empty State ───────────────────────────────────────────────────────────────
const EmptyCartState = () => (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIconCircle}>
      <ShoppingBag size={52} color={C.blue} />
    </View>
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function CartContent() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [guestCartItems, setGuestCartItems] = useState<CartItem[]>([]);
  const [popularItems, setPopularItems] = useState<PopularProductItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  // States cho Modal lựa chọn variant
  const [isSelectionModalVisible, setSelectionModalVisible] = useState(false);
  const [selectingProduct, setSelectingProduct] = useState<any>(null);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isProcessingAdd, setIsProcessingAdd] = useState(false);

  // --- REALTIME HOOKS ---
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useSupabaseRealtime({
    table: 'cart_items',
    onUpdate: () => setRefreshTrigger(prev => prev + 1)
  });
  useSupabaseRealtime({
    table: 'wishlist',
    onUpdate: () => setRefreshTrigger(prev => prev + 1)
  });
  useSupabaseRealtime({
    table: 'products',
    onUpdate: () => setRefreshTrigger(prev => prev + 1)
  });



  const increase = async (id: string) => {
    const item = cartItems.find((i) => i.id === id);
    if (!item) return;

    const newQty = item.quantity + 1;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      await updateGuestCartQuantity(id, newQty);
      setGuestCartItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)),
      );
      return;
    }

    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)),
    );
    await supabase.from("cart_items").update({ quantity: newQty }).eq("id", id);
  };

  const decrease = async (id: string) => {
    const item = cartItems.find((i) => i.id === id);
    if (!item || item.quantity <= 1) return;

    const newQty = item.quantity - 1;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      await updateGuestCartQuantity(id, newQty);
      setGuestCartItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)),
      );
      return;
    }

    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)),
    );
    await supabase.from("cart_items").update({ quantity: newQty }).eq("id", id);
  };

  const deleteItem = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      await removeFromGuestCart(id);
      setGuestCartItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }

    setCartItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("cart_items").delete().eq("id", id);
  };

  const addWishlistToCart = async (item: WishlistItem) => {
    try {
      // Thay vì add thẳng, ta fetch toàn bộ thông tin sản phẩm và mở Modal chọn size/color
      const { data: productData, error } = await supabase
        .from('products')
        .select(`
          id, name, price, images,
          product_discounts ( discount_type, discount_value, is_active ),
          product_variants ( id, color, size, stock )
        `)
        .eq('id', item.product_id)
        .single();

      if (error || !productData) {
        alert("Không thể lấy thông tin sản phẩm");
        return;
      }

      setSelectingProduct(productData);
      setProductVariants(productData.product_variants || []);
      setSelectedColor(null);
      setSelectedSize(null);
      setSelectionModalVisible(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectingProduct) return;

    // Kiểm tra đã chọn đủ màu/size chưa
    const hasColors = productVariants.some(v => v.color);
    const hasSizes = productVariants.some(v => v.size);

    if ((hasColors && !selectedColor) || (hasSizes && !selectedSize)) {
      alert("Vui lòng chọn đầy đủ phân loại!");
      return;
    }

    try {
      setIsProcessingAdd(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Guest: save to AsyncStorage
        const guestItem = {
          product_id: String(selectingProduct.id),
          name: selectingProduct.name,
          price: selectingProduct.price,
          originalPrice: selectingProduct.price,
          hasDiscount: false,
          quantity: 1,
          image: selectingProduct.images?.[0] || "",
          color: COLOR_TRANSLATIONS[selectedColor || ""] || selectedColor || "",
          size: selectedSize || "",
          rawColor: selectedColor || "",
          rawSize: selectedSize || "",
        };
        await addToGuestCart(guestItem);
        setSelectionModalVisible(false);
        Alert.alert("Đã thêm vào giỏ hàng", "Giỏ hàng sẽ được lưu trên thiết bị này.");
        // Reload guest cart để hiển thị
        const rawGuest = await getGuestCart();
        setGuestCartItems(rawGuest.map((item) => ({
          id: item.id,
          name: item.name,
          size: item.size || "M",
          color: item.color,
          price: item.price,
          originalPrice: item.originalPrice,
          finalPrice: item.hasDiscount ? item.originalPrice : item.price,
          hasDiscount: item.hasDiscount,
          image: item.image,
          quantity: item.quantity,
        })));
        return;
      }

      const { data: existingCart } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', selectingProduct.id)
        .eq('color', selectedColor || null)
        .eq('size', selectedSize || null)
        .maybeSingle();

      if (existingCart) {
        await supabase
          .from('cart_items')
          .update({ quantity: existingCart.quantity + 1, is_selected: true })
          .eq('id', existingCart.id);
      } else {
        await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: selectingProduct.id,
            quantity: 1,
            color: selectedColor || null,
            size: selectedSize || null,
            is_selected: true
          });
      }

      setSelectionModalVisible(false);
      alert("Đã thêm vào giỏ hàng!");
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingAdd(false);
    }
  };

  // ── State tích chọn sản phẩm ──────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = async (id: string) => {
    const willBeSelected = !selectedIds.has(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Đồng bộ xuống DB để checkout đọc đúng
    await supabase.from("cart_items").update({ is_selected: willBeSelected }).eq("id", id);
  };

  const isAllSelected =
    cartItems.length > 0 &&
    selectedIds.size === cartItems.length &&
    guestCartItems.length === 0;

  const toggleSelectAll = async () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
      // Bỏ chọn tất cả trong DB
      await supabase.from("cart_items").update({ is_selected: false }).in("id", cartItems.map(i => i.id));
    } else {
      setSelectedIds(new Set(cartItems.map((i) => i.id)));
      // Chọn tất cả trong DB
      await supabase.from("cart_items").update({ is_selected: true }).in("id", cartItems.map(i => i.id));
    }
  };

  // Ghép guest cart + user cart để tính toán
  const allCartItems = [...guestCartItems, ...cartItems];
  // Guest items luôn được coi là "selected" (không có checkbox)
  const allSelectedIds = new Set([
    ...guestCartItems.map((i) => i.id),
    ...selectedIds,
  ]);

  // Tính tổng theo giá đã giảm (chỉ tính sản phẩm được tích chọn)
  const total = allCartItems
    .filter((i) => allSelectedIds.has(i.id))
    .reduce((s, i) => s + i.finalPrice * i.quantity, 0);
  // Tổng giá gốc – dùng để tính mức tiết kiệm
  const subtotal = allCartItems
    .filter((i) => allSelectedIds.has(i.id))
    .reduce((s, i) => s + i.originalPrice * i.quantity, 0);
  const savings = subtotal - total;
  const isEmpty = allCartItems.length === 0;



  // Thêm State để quản lý trạng thái tải giỏ hàng
  const [loadingCart, setLoadingCart] = useState(true);

  const fetchCartItems = async (isSilent = false) => {
    try {
      if (!isSilent && cartItems.length === 0) setLoadingCart(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // ── Guest: đọc từ AsyncStorage ─────────────────────────────────────────
      if (!user) {
        const rawGuest = await getGuestCart();
        const guestItems: CartItem[] = rawGuest.map((item) => ({
          id: item.id,
          name: item.name,
          size: item.size || "M",
          color: item.color,
          price: item.price,
          originalPrice: item.originalPrice,
          finalPrice: item.hasDiscount ? item.originalPrice : item.price,
          hasDiscount: item.hasDiscount,
          image: item.image,
          quantity: item.quantity,
        }));
        setGuestCartItems(guestItems);
        setLoadingCart(false);
        return;
      }

      // ── Authenticated: đọc từ DB ────────────────────────────────────────────
      const { data, error } = await supabase
        .from("cart_items")
        .select(
          `
        id,
        quantity,
        size,
        color,
        product_id,
        is_selected,
        products (
          name,
          price,
          images,
          variants,
          product_discounts (
            id, discount_type, discount_value, is_active, start_date, end_date
          )
        )
      `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 2. Định dạng lại dữ liệu để lấy đúng ảnh theo màu
      const formattedCart: CartItem[] = (data || []).map((item: any) => {
        const productInfo = item.products;
        const selectedColor = item.color;

        const withDiscount = calculateDiscountedPrice(productInfo);

        return {
          id: item.id,
          name: productInfo.name,
          size: item.size || "M",
          color: COLOR_TRANSLATIONS[selectedColor?.toLowerCase()] || selectedColor,
          price: productInfo.price,
          originalPrice: withDiscount.originalPrice,
          finalPrice: withDiscount.finalPrice,
          hasDiscount: withDiscount.hasDiscount,
          image: getProductImageByColor(productInfo, selectedColor),
          quantity: item.quantity,
        };
      });

      setCartItems(formattedCart);
      // Khởi tạo selectedIds từ giá trị is_selected trong DB (không mặc định chọn tất cả)
      const preSelected = new Set(
        (data || []).filter((item: any) => item.is_selected).map((item: any) => item.id)
      );
      setSelectedIds(preSelected);
    } catch (error) {
      console.error("Lỗi tải giỏ hàng:", error);
    } finally {
      setLoadingCart(false);
    }
  };


  const fetchWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          product_id,
          products (
            id, name, price, images, variants,
            product_discounts (
              discount_type, discount_value, is_active, start_date, end_date
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      if (data) {
        const formatted = data.map((item: any) => {
          const p = item.products;
          const discountInfo = calculateDiscountedPrice(p);
          return {
            id: item.id,
            product_id: p.id,
            name: p.name,
            price: discountInfo.finalPrice,
            originalPrice: discountInfo.originalPrice,
            hasDiscount: discountInfo.hasDiscount,
            image: p.images ? p.images[0] : "",
            color: p.variants && p.variants[0] ? p.variants[0].color : "Mặc định",
            size: p.variants && p.variants[0] && p.variants[0].sizes[0] ? p.variants[0].sizes[0].size : "M",
          };
        });
        setWishlistItems(formatted);
      }
    } catch (e) { console.error("Lỗi fetch wishlist", e); }
  }

  const fetchPopularProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, price, images,
          product_discounts (
            discount_type, discount_value, is_active, start_date, end_date
          )
        `)
        .eq('is_active', true)
        .order('id', { ascending: false }) 
        .limit(6);
        
      if (error) console.error(error);
      if (data) {
        const formatted = data.map((item: any) => {
          const discountInfo = calculateDiscountedPrice(item);
          return {
            id: String(item.id),
            name: item.name,
            price: item.price,
            originalPrice: discountInfo.originalPrice,
            finalPrice: discountInfo.finalPrice,
            hasDiscount: discountInfo.hasDiscount,
            image: item.images ? item.images[0] : "https://via.placeholder.com/400",
            badge: discountInfo.hasDiscount ? "Sale" : "Hot",
            badgeColor: discountInfo.hasDiscount ? "#EF4444" : "#3B82F6",
          };
        });
        setPopularItems(formatted);
      }
    } catch (err) {
      console.error("Lỗi fetch popular products:", err);
    }
  }


  useFocusEffect(
    useCallback(() => {
      const isInitial = cartItems.length === 0 && wishlistItems.length === 0;
      fetchCartItems(!isInitial);
      fetchWishlist();
      fetchPopularProducts();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]),
  );

  return (
    <View style={styles.safe}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >


        {/* ── Cart Items ── */}
        {loadingCart ? (
          <ActivityIndicator
            size="large"
            color={C.blue}
            style={{ marginTop: 50 }}
          />
        ) : isEmpty ? (
          <EmptyCartState />
        ) : (
          <View style={styles.section}>
            {/* ── Chọn tất cả ── */}
            <TouchableOpacity
              style={styles.selectAllRow}
              onPress={toggleSelectAll}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  isAllSelected && styles.checkboxChecked,
                ]}
              >
                {isAllSelected && (
                  <Check size={13} color="#fff" strokeWidth={3} />
                )}
              </View>
              <Text style={styles.selectAllText}>
                Chọn tất cả ({cartItems.length})
              </Text>
            </TouchableOpacity>

            {cartItems.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onIncrease={increase}
                onDecrease={decrease}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={toggleSelect}
                onDelete={deleteItem}
              />
            ))}

            {/* ── Guest Cart Items (không có checkbox) ── */}
            {guestCartItems.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onIncrease={increase}
                onDecrease={decrease}
                isSelected={true}
                onToggleSelect={() => {}}
                onDelete={deleteItem}
              />
            ))}
          </View>
        )}

        {/* ── From Your Wishlist ── */}
        {wishlistItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Từ danh sách yêu thích</Text>
            {wishlistItems.map((item) => (
              <WishlistRow
                key={item.id}
                item={item}
                onAddToCart={addWishlistToCart}
              />
            ))}
          </View>
        )}

        {/* ── Most Popular (only shown when cart is empty) ── */}
        {isEmpty && popularItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.popularHeader}>
              <Text style={styles.sectionTitle}>Phổ biến nhất</Text>
              <TouchableOpacity style={styles.seeAllBtn}
                onPress={() => router.push("/product/popular-products" as any)} // Điều hướng đến trang tìm kiếm chung, có thể lọc theo sản phẩm phổ biến ở đó
              >
                <Text style={styles.seeAllText}>Xem tất cả</Text>
                <View style={styles.seeAllCircle}>
                  <Plus size={14} color={C.white} />
                </View>
              </TouchableOpacity>
            </View>
            <FlatList
              data={popularItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <PopularCard item={item} style={styles.popularCard} />
              )}
            />
          </View>
        )}

        {/* Bottom padding for footer */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Fixed Footer ── */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {/* Dòng Tiết kiệm (chỉ hiện khi có giảm giá) */}
          {savings > 0 && (
            <Text style={styles.savingsText}>
              Tiết kiệm ↓ {savings.toLocaleString("vi-VN")} đ
            </Text>
          )}
          <View style={styles.totalWrap}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>
              {total.toLocaleString("vi-VN")} đ
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, isEmpty && styles.checkoutBtnDisabled]}
          activeOpacity={0.85}
          onPress={() => !isEmpty && router.push("/(shop)/checkout")}
        >
          <Text
            style={[
              styles.checkoutText,
              isEmpty && styles.checkoutTextDisabled,
            ]}
          >
            Thanh toán
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal Lựa chọn Size/Màu cho Wishlist Item ── */}
      <Modal
        visible={isSelectionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectionModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectionModalVisible(false)}
        />
        <View style={styles.selectionSheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetProductInfo}>
              <Image
                source={{ uri: selectingProduct?.images?.[0] || 'https://via.placeholder.com/100' }}
                style={styles.sheetThumb}
              />
              <View>
                <Text style={styles.sheetPrice}>
                  {(selectingProduct?.price || 0).toLocaleString('vi-VN')} đ
                </Text>
                <Text style={styles.sheetStock}>
                  Chọn phân loại sản phẩm
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectionModalVisible(false)}>
              <CloseIcon size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {/* Màu sắc */}
            {productVariants.some(v => v.color) && (
              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Màu sắc</Text>
                <View style={styles.chipGrid}>
                  {[...new Set(productVariants.map(v => v.color))].filter(Boolean).map((color: any) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.chip,
                        selectedColor === color && styles.chipSelected
                      ]}
                      onPress={() => setSelectedColor(color)}
                    >
                      <Text style={[
                        styles.chipText,
                        selectedColor === color && styles.chipTextSelected
                      ]}>{color}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Kích thước */}
            {productVariants.some(v => v.size) && (
              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Kích thước</Text>
                <View style={styles.chipGrid}>
                  {[...new Set(productVariants.filter(v => !selectedColor || v.color === selectedColor).map(v => v.size))].filter(Boolean).map((size: any) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.chip,
                        selectedSize === size && styles.chipSelected
                      ]}
                      onPress={() => setSelectedSize(size)}
                    >
                      <Text style={[
                        styles.chipText,
                        selectedSize === size && styles.chipTextSelected
                      ]}>{size}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[styles.confirmBtn, isProcessingAdd && { opacity: 0.6 }]}
              onPress={handleConfirmSelection}
              disabled={isProcessingAdd}
            >
              {isProcessingAdd ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Xác nhận thêm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: C.text, flex: 1 },
  backBtnHeader: { paddingRight: 4 },
  badge: {
    backgroundColor: C.bg2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: "center",
  },
  badgeText: { fontSize: 14, fontWeight: "700", color: C.text },

  scrollContent: { paddingBottom: 16 },



  // Sections
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
    marginBottom: 16,
  },

  // Cart Row
  cartRow: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 14,
  },
  cartImageWrap: {
    width: 110,
    height: 130,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: C.bg2,
    position: "relative",
  },
  cartImage: { width: "100%", height: "100%" },
  deleteBtn: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartDetails: { flex: 1, paddingVertical: 4, justifyContent: "space-between" },
  cartNameRow: { position: "relative", paddingRight: 40 },
  cartName: { fontSize: 14, fontWeight: "500", color: C.text, lineHeight: 20 },

  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: C.bg,
  },
  checkboxChecked: {
    backgroundColor: C.blue,
    borderColor: C.blue,
  },
  // Hàng "Chọn tất cả"
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },

  // Tags
  tagsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  tag: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tagText: { fontSize: 13, color: C.text, fontWeight: "500" },

  // Stepper
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    minWidth: 20,
    textAlign: "center",
  },

  // Wishlist extra
  wishlistBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  addCartBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: C.bg2,
    alignItems: "center",
    justifyContent: "center",
  },

  // Popular section
  popularHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  seeAllText: { fontSize: 15, fontWeight: "600", color: C.text },
  seeAllCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  popularCard: { width: 130 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  // Modal Selection Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  selectionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    minHeight: '40%',
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sheetProductInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  sheetThumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  sheetPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  sheetStock: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  sheetScroll: {
    paddingHorizontal: 24,
  },
  sheetSection: {
    marginBottom: 24,
  },
  sheetSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#2563EB',
  },
  sheetFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  confirmBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: C.text },
  totalValue: { fontSize: 18, fontWeight: "800", color: C.text },
  footerLeft: { flex: 1 },
  savingsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  checkoutBtn: {
    backgroundColor: C.blue,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  checkoutBtnDisabled: { backgroundColor: C.bg2 },
  checkoutText: { fontSize: 16, fontWeight: "700", color: C.white },
  checkoutTextDisabled: { color: C.sub },


});
