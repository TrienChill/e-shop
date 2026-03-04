import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  X as CloseIcon,
  Minus,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PopularCard,
  PopularProductItem,
} from "../../../src/components/card/PopularCard";
import { supabase } from "../../../src/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CartItem {
  id: string;
  name: string;
  size: string;
  color: string;
  price: number;
  image: string;
  quantity: number;
}

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  color: string;
  size: string;
  image: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const INITIAL_CART: CartItem[] = [
  {
    id: "1",
    name: "Sản phẩm thời trang cao cấp",
    size: "M",
    color: "Hồng",
    price: 170000,
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
    quantity: 1,
  },
  {
    id: "2",
    name: "Sản phẩm thời trang cao cấp",
    size: "M",
    color: "Hồng",
    price: 170000,
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027614a4?w=400&q=80",
    quantity: 1,
  },
];

const WISHLIST_ITEMS: WishlistItem[] = [
  {
    id: "w1",
    name: "Sản phẩm thời trang cao cấp",
    price: 170000,
    color: "Hồng",
    size: "M",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
  },
  {
    id: "w2",
    name: "Sản phẩm thời trang cao cấp",
    price: 170000,
    color: "Trắng",
    size: "S",
    image:
      "https://images.unsplash.com/photo-1499939667766-4afceb292d05?w=400&q=80",
  },
];

const POPULAR_ITEMS: PopularProductItem[] = [
  {
    id: "p1",
    name: "Áo Kiểu Nữ",
    price: 178000,
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
    badge: "New",
    badgeColor: "#3B82F6",
  },
  {
    id: "p2",
    name: "Váy Hoa Nhí",
    price: 178000,
    image:
      "https://images.unsplash.com/photo-1499939667766-4afceb292d05?w=400&q=80",
    badge: "Sale",
    badgeColor: "#EF4444",
  },
  {
    id: "p3",
    name: "Đầm Đỏ Đẹp",
    price: 178000,
    image:
      "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400&q=80",
    badge: "Hot",
    badgeColor: "#F97316",
  },
  {
    id: "p4",
    name: "Sơ Mi Trắng",
    price: 178000,
    image:
      "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400&q=80",
  },
];

// ─── Colors ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#FFFFFF",
  text: "#111827",
  sub: "#6B7280",
  border: "#E5E7EB",
  bg2: "#F3F4F6",
  blue: "#2563EB",
  white: "#FFFFFF",
};

const colorTranslations: { [key: string]: string } = {
  black: "Đen",
  white: "Trắng",
  red: "Đỏ",
  blue: "Xanh dương",
  green: "Xanh lá",
  yellow: "Vàng",
  pink: "Hồng",
  gray: "Xám",
  brown: "Nâu",
};

// ─── Cart Item Row ─────────────────────────────────────────────────────────────
const CartItemRow = ({
  item,
  onIncrease,
  onDecrease,
  onDelete,
}: {
  item: CartItem;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onDelete: (id: string) => void;
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
        onPress={() => onDelete(item.id)}
      >
        <Trash2 size={16} color={C.sub} />
      </TouchableOpacity>
    </View>

    {/* Details */}
    <View style={styles.cartDetails}>
      <Text style={styles.cartName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.cartMeta}>
        {item.price.toLocaleString("vi-VN")} đ
      </Text>

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
      <TouchableOpacity style={styles.deleteBtn}>
        <Trash2 size={16} color={C.sub} />
      </TouchableOpacity>
    </View>

    {/* Details */}
    <View style={styles.cartDetails}>
      <Text style={styles.cartName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.cartMeta}>
        {item.price.toLocaleString("vi-VN")} đ
      </Text>

      {/* Color + Size tags + Add to cart */}
      <View style={styles.wishlistBottom}>
        <View style={styles.tagsRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.color}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.size}</Text>
          </View>
        </View>
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

// ─── Shipping Address Card ─────────────────────────────────────────────────────
const ShippingCard = ({
  address,
  onEdit,
  loading,
}: {
  address: any;
  onEdit: () => void;
  loading: boolean;
}) => (
  <View style={styles.shippingCard}>
    <View style={styles.shippingTextWrap}>
      <Text style={styles.shippingTitle}>Địa chỉ giao hàng</Text>
      {loading ? (
        <Text style={styles.shippingAddr}>Đang tải địa chỉ...</Text>
      ) : address ? (
        <Text style={styles.shippingAddr}>
          {address.receiver_name} | {address.phone_number}
          {"\n"}
          {address.street_address}, {address.district}, {address.province_city}
        </Text>
      ) : (
        <Text style={[styles.shippingAddr, { color: "#EF4444" }]}>
          Chưa có địa chỉ mặc định. Vui lòng thiết lập!
        </Text>
      )}
    </View>
    <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
      <Pencil size={16} color={C.white} />
    </TouchableOpacity>
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function CartScreen() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>(INITIAL_CART);

  // Address Modal States
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressData, setAddressData] = useState({
    name: "Triển Chill",
    phone: "0345678910",
    city: "TP. Hồ Chí Minh",
    district: "Quận 2",
    street: "26, Đường số 2, Phường Thảo Điền",
    isDefault: true,
  });

  const handleSaveAddress = async () => {
    // 1. Kiểm tra nhanh đầu vào
    if (!addressData.name.trim() || !addressData.phone.trim()) {
      alert("Vui lòng điền đủ Họ tên và Số điện thoại");
      return;
    }

    try {
      // 2. Lấy User ID hiện tại
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Vui lòng đăng nhập để lưu địa chỉ");
        return;
      }

      // 3. Chuẩn bị dữ liệu gửi lên Database (mapping đúng tên cột)
      const payload = {
        user_id: user.id,
        receiver_name: addressData.name,
        phone_number: addressData.phone,
        province_city: addressData.city,
        district: addressData.district,
        street_address: addressData.street,
        is_default: addressData.isDefault,
        updated_at: new Date(),
      };

      // 4. Nếu đang sửa địa chỉ cũ (đã có id trong defaultAddress), ta thêm ID vào payload
      const finalPayload = defaultAddress?.id
        ? { ...payload, id: defaultAddress.id }
        : payload;

      // 5. Thực hiện UPSERT vào Supabase
      const { data, error } = await supabase
        .from("user_addresses")
        .upsert(finalPayload)
        .select()
        .single();

      if (error) throw error;

      // 6. Cập nhật lại State hiển thị trên màn hình
      setDefaultAddress(data);
      setAddressModalVisible(false);
      alert("Lưu địa chỉ thành công!");
    } catch (error: any) {
      console.error("Lỗi lưu địa chỉ:", error.message);
      alert("Không thể lưu địa chỉ: " + error.message);
    }
  };

  const increase = async (id: string) => {
    const item = cartItems.find((i) => i.id === id);
    if (!item) return;

    const newQty = item.quantity + 1;
    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)),
    );

    await supabase.from("cart_items").update({ quantity: newQty }).eq("id", id);
  };

  const decrease = async (id: string) => {
    const item = cartItems.find((i) => i.id === id);
    if (!item || item.quantity <= 1) return;

    const newQty = item.quantity - 1;
    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)),
    );

    await supabase.from("cart_items").update({ quantity: newQty }).eq("id", id);
  };

  const deleteItem = async (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("cart_items").delete().eq("id", id);
  };

  const addWishlistToCart = (item: WishlistItem) => {
    setCartItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists)
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const isEmpty = cartItems.length === 0;
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  // Thêm vào trong CartScreen
  const [defaultAddress, setDefaultAddress] = useState<any>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);

  // Thêm State để quản lý trạng thái tải giỏ hàng
  const [loadingCart, setLoadingCart] = useState(true);

  const fetchCartItems = async () => {
    try {
      setLoadingCart(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch cart_items join với products
      const { data, error } = await supabase
        .from("cart_items")
        .select(
          `
        id,
        quantity,
        size,
        color,
        product_id,
        products (
          name,
          price,
          images,
          variants
        )
      `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 2. Định dạng lại dữ liệu để lấy đúng ảnh theo màu
      const formattedCart: CartItem[] = (data || []).map((item: any) => {
        const productInfo = item.products;
        const selectedColor = item.color; // Ví dụ: "White"

        // Tìm image_index trong JSON variants.options dựa trên item.color
        const colorOption = productInfo.variants?.options?.find(
          (opt: any) => opt.color === selectedColor,
        );

        // Nếu tìm thấy màu thì lấy image_index, không thì mặc định là 0
        const targetIndex =
          colorOption?.image_index !== undefined ? colorOption.image_index : 0;

        // Lấy tên file ảnh từ mảng images theo index
        const imageName =
          productInfo.images?.[targetIndex] || productInfo.images?.[0];

        // Xử lý URL ảnh từ Supabase Storage
        let imageUrl = "https://via.placeholder.com/400";
        if (imageName) {
          imageUrl = imageName.startsWith("http")
            ? imageName
            : `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-imagess/${imageName}`;
        }

        return {
          id: item.id,
          name: productInfo.name,
          size: item.size || "M",
          color: colorTranslations[selectedColor] || selectedColor, // Dịch "White" thành "Trắng"
          price: productInfo.price,
          image: imageUrl,
          quantity: item.quantity,
        };
      });

      setCartItems(formattedCart);
    } catch (error) {
      console.error("Lỗi tải giỏ hàng:", error);
    } finally {
      setLoadingCart(false);
    }
  };

  const fetchDefaultAddress = async () => {
    try {
      // Lấy địa chỉ được đánh dấu là mặc định của user hiện tại
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("is_default", true)
        .single(); // Chỉ lấy 1 bản ghi mặc định

      if (error && error.code !== "PGRST116") {
        // PGRST116 là lỗi không tìm thấy bản ghi
        console.error("Lỗi lấy địa chỉ:", error.message);
      } else {
        setDefaultAddress(data);
        // Nếu tìm thấy, cập nhật luôn dữ liệu vào modal edit để đồng bộ
        if (data) {
          setAddressData({
            name: data.receiver_name,
            phone: data.phone_number,
            city: data.province_city,
            district: data.district,
            street: data.street_address,
            isDefault: data.is_default,
          });
        }
      }
    } catch (err) {
      console.log("System error:", err);
    } finally {
      setLoadingAddress(false);
    }
  };

  // Gọi hàm fetch khi màn hình được load

  // Thay thế hoặc bổ sung thêm bên cạnh useEffect cũ
  useFocusEffect(
    useCallback(() => {
      // Mỗi khi màn hình này được nhìn thấy, ta sẽ fetch lại dữ liệu mới nhất
      fetchCartItems();
      fetchDefaultAddress();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtnHeader}
        >
          <ChevronLeft size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giỏ hàng</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cartCount}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Shipping Address */}
        <ShippingCard
          address={defaultAddress}
          onEdit={() => setAddressModalVisible(true)}
          loading={loadingAddress}
        />

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
            {cartItems.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onIncrease={increase}
                onDecrease={decrease}
                onDelete={deleteItem}
              />
            ))}
          </View>
        )}

        {/* ── From Your Wishlist ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Từ danh sách yêu thích</Text>
          {WISHLIST_ITEMS.map((item) => (
            <WishlistRow
              key={item.id}
              item={item}
              onAddToCart={addWishlistToCart}
            />
          ))}
        </View>

        {/* ── Most Popular (only shown when cart is empty) ── */}
        {isEmpty && (
          <View style={styles.section}>
            <View style={styles.popularHeader}>
              <Text style={styles.sectionTitle}>Phổ biến nhất</Text>
              <TouchableOpacity style={styles.seeAllBtn}>
                <Text style={styles.seeAllText}>Xem tất cả</Text>
                <View style={styles.seeAllCircle}>
                  <Plus size={14} color={C.white} />
                </View>
              </TouchableOpacity>
            </View>
            <FlatList
              data={POPULAR_ITEMS}
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
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalValue}>
            {total.toLocaleString("vi-VN")} đ
          </Text>
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

      {/* ── Address Edit Modal ── */}
      <Modal
        visible={addressModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAddressModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cập nhật địa chỉ</Text>
              <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
                <CloseIcon size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Họ tên</Text>
                <TextInput
                  style={styles.input}
                  value={addressData.name}
                  onChangeText={(t) =>
                    setAddressData({ ...addressData, name: t })
                  }
                  placeholder="Nhập họ tên"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  value={addressData.phone}
                  onChangeText={(t) =>
                    setAddressData({ ...addressData, phone: t })
                  }
                  placeholder="Nhập số điện thoại"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tỉnh / Thành phố</Text>
                <TextInput
                  style={styles.input}
                  value={addressData.city}
                  onChangeText={(t) =>
                    setAddressData({ ...addressData, city: t })
                  }
                  placeholder="Nhập tỉnh/thành phố"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Quận / Huyện</Text>
                <TextInput
                  style={styles.input}
                  value={addressData.district}
                  onChangeText={(t) =>
                    setAddressData({ ...addressData, district: t })
                  }
                  placeholder="Nhập quận/huyện"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên đường / Số nhà</Text>
                <TextInput
                  style={styles.input}
                  value={addressData.street}
                  onChangeText={(t) =>
                    setAddressData({ ...addressData, street: t })
                  }
                  placeholder="Nhập tên đường, số nhà"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Đặt làm địa chỉ mặc định</Text>
                <Switch
                  value={addressData.isDefault}
                  onValueChange={(v) =>
                    setAddressData({ ...addressData, isDefault: v })
                  }
                  trackColor={{ false: "#D1D5DB", true: C.blue }}
                />
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveAddress}
              >
                <Text style={styles.saveBtnText}>Lưu địa chỉ</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
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

  // Shipping Card
  shippingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg2,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    gap: 12,
  },
  shippingTextWrap: { flex: 1 },
  shippingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  shippingAddr: { fontSize: 13, color: C.sub, lineHeight: 20 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
  },

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
  cartName: { fontSize: 14, fontWeight: "500", color: C.text, lineHeight: 20 },
  cartMeta: { fontSize: 16, fontWeight: "700", color: C.text },

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
  totalWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  totalLabel: { fontSize: 18, fontWeight: "800", color: C.text },
  totalValue: { fontSize: 18, fontWeight: "700", color: C.text },
  checkoutBtn: {
    backgroundColor: C.blue,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  checkoutBtnDisabled: { backgroundColor: C.bg2 },
  checkoutText: { fontSize: 16, fontWeight: "700", color: C.white },
  checkoutTextDisabled: { color: C.sub },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: C.sub,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.bg2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
  },
  saveBtn: {
    backgroundColor: C.text,
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  saveBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
