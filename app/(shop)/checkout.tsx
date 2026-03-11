import { supabase } from "@/src/lib/supabase";
import {
  COLOR_TRANSLATIONS,
  getProductImageByColor,
} from "@/src/services/product";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Banknote,
  Check,
  CheckCircle2,
  ChevronLeft,
  Gift,
  Pencil,
  Plus,
  Settings,
  ShoppingBag,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Bảng màu chủ đạo cho thiết kế
const COLORS = {
  primary: "#0055FF", // Xanh dương cho các nút chỉnh sửa và badge
  secondary: "#1A1A1A", // Đen cho văn bản chính và nút thanh toán
  background: "#FFFFFF",
  surface: "#F9F9F9",
  textSecondary: "#666666",
  border: "#EEEEEE",
  lightBlue: "#E6EFFF",
  grayBadge: "#EAEBFF",
  voucherBg: "#FFFFFF",
  expiryBadge: "#FFE4E1",
};

const C = {
  bg: "#FFFFFF",
  text: "#111827",
  sub: "#6B7280",
  border: "#E5E7EB",
  bg2: "#F3F4F6",
  blue: "#0055FF", // Updated to main blue
  white: "#FFFFFF",
  success: "#4ADE80",
  error: "#EF4444",
};

// Dữ liệu mẫu cho Phương thức thanh toán
const PAYMENT_METHODS = [
  {
    id: "1",
    type: "Mastercard",
    number: "**** **** **** 1579",
    holder: "Triển Chill",
    expiry: "12/22",
    bgColor: "#EEF2FF", // Light Blue Pastel
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png",
  },
  {
    id: "2",
    type: "Visa",
    number: "**** **** **** 4242",
    holder: "Triển Chill",
    expiry: "09/25",
    bgColor: "#FFF1F2", // Light Pink Pastel
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png",
  },
  {
    id: "cash",
    type: "Cash",
    name: "Tiền mặt (COD)",
    number: "Thanh toán khi nhận hàng",
    bgColor: "#F3F4F6", // Light Gray
    icon: Banknote,
  },
];

export default function CheckoutScreen() {
  const router = useRouter();

  const [showVouchers, setShowVouchers] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);

  // Đặt mặc định tiền mặt (COD) là phương thức thanh toán được chọn ban đầu
  const [selectedPaymentId, setSelectedPaymentId] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");

  const renderInfoCard = (
    title: string,
    content: string,
    subContent?: string,
  ) => (
    <View style={styles.infoCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text
          style={[
            styles.cardContent,
            content.includes("Chưa") && { color: C.error },
          ]}
        >
          {content}
        </Text>
        {subContent && <Text style={styles.cardSubContent}>{subContent}</Text>}
      </View>
      <TouchableOpacity
        style={styles.editButtonCircleLarge}
        activeOpacity={0.8}
        onPress={() => router.push("/(shop)/(tabs)/cart")}
      >
        <Pencil color={C.blue} size={18} />
      </TouchableOpacity>
    </View>
  );

  // Thêm vào trong component CheckoutScreen
  const [userAddress, setUserAddress] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Thêm các state mới
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tính tổng tiền dựa trên sản phẩm thực tế và phí ship
  const productsTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Thêm State để lưu voucher từ database
  const [dbVouchers, setDbVouchers] = useState<any[]>([]);

  // Thêm State mới vào CheckoutScreen
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(
    null,
  );

  // Cập nhật phí vận chuyển dựa trên phương thức được chọn từ DB
  const selectedMethod = shippingMethods.find(
    (m) => m.id === selectedShippingId,
  );
  const shippingFee = selectedMethod ? Number(selectedMethod.price) : 0;

  const discountAmount = selectedVoucher
    ? selectedVoucher.type === "percentage"
      ? (productsTotal * selectedVoucher.discount) / 100
      : selectedVoucher.discount // Nếu là số tiền mặt thì trừ trực tiếp
    : 0;
  // Đảm bảo số tiền giảm không vượt quá tổng đơn
  const finalDiscount = Math.min(discountAmount, productsTotal);
  const finalTotal = productsTotal + shippingFee - finalDiscount;

  // Giả lập thanh toán
  useEffect(() => {
    if (paymentStatus === "processing") {
      const timer = setTimeout(() => {
        // Có thể ngẫu nhiên hóa success/error ở đây nếu muốn
        setPaymentStatus("success");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus]);

  useEffect(() => {
    const fetchCheckoutInfo = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Lấy thông tin địa chỉ & profile người nhận
        const { data: defaultAddr } = await supabase
          .from("user_addresses")
          .select(
            "receiver_name, phone_number, province_city, district, street_address",
          )
          .eq("user_id", user.id)
          .eq("is_default", true)
          .maybeSingle();

        if (defaultAddr) {
          setUserProfile({
            name: defaultAddr.receiver_name,
            phone: defaultAddr.phone_number,
            email: user.email,
          });
          setUserAddress(defaultAddr);
        }

        // 2. Lấy danh sách sản phẩm ĐANG ĐƯỢC CHỌN trong giỏ hàng
        const { data: cartData } = await supabase
          .from("cart_items")
          .select(
            `
            id,
            product_id,
            quantity,
            color,
            size,
            products (
              name,
              price,
              images,
              variants
            )
          `,
          )
          .eq("user_id", user.id)
          .eq("is_selected", true); // Chỉ lấy những món người dùng tích chọn để thanh toán

        // 3. Fetch danh sách Voucher khả dụng

        const { data: voucherData } = await supabase
          .from("vouchers")
          .select("*")
          .eq("is_active", true) // Chỉ lấy voucher đang hoạt động
          .gt("expired_at", new Date().toISOString()) // SỬA: expiry_date -> expired_at
          .order("discount_value", { ascending: false }); // SỬA: discount_percent -> discount_value

        if (voucherData && voucherData.length > 0) {
          const formattedVouchers = voucherData.map((v) => ({
            id: v.id,
            title: v.code,
            description:
              v.description ||
              (v.discount_type === "percentage"
                ? `Giảm ${v.discount_value}% đơn hàng`
                : `Giảm ${v.discount_value.toLocaleString("vi-VN")}đ đơn hàng`),
            validUntil: v.expired_at
              ? new Date(v.expired_at).toLocaleDateString("vi-VN")
              : "Không thời hạn", // SỬA: expired_at
            discount: Number(v.discount_value), // Ép kiểu số cho numeric
            type: v.discount_type, // Lưu lại loại giảm giá để tính toán sau này
            icon: v.discount_value > 10 ? Gift : ShoppingBag,
          }));

          setDbVouchers(formattedVouchers);
        }

        // 4. Fetch danh sách Phương thức vận chuyển từ bảng mới
        const { data: shipData } = await supabase
          .from("shipping_methods")
          .select("*")
          .eq("is_active", true)
          .order("price", { ascending: true });

        if (shipData && shipData.length > 0) {
          setShippingMethods(shipData);
          // Tự động chọn phương thức đầu tiên (thường là rẻ nhất) làm mặc định
          setSelectedShippingId(shipData[0].id);
        }

        if (cartData) {
          const formattedItems = cartData.map((item: any) => {
            const p = item.products;
            return {
              id: item.id,
              product_id: item.product_id, // THÊM DÒNG NÀY: Đây là ID số của sản phẩm
              name: p.name,
              price: p.price,
              quantity: item.quantity,
              image: getProductImageByColor(p, item.color),
              color: COLOR_TRANSLATIONS[item.color] || item.color,
              size: item.size,
            };
          });
          setCartItems(formattedItems);
        }
      } catch (err) {
        console.error("Lỗi fetch checkout:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutInfo();
  }, []);

  const handlePlaceOrder = async () => {
    if (!userAddress || cartItems.length === 0) {
      setPaymentStatus("idle");
      alert("Vui lòng kiểm tra lại địa chỉ và giỏ hàng!");
      return;
    }

    setPaymentStatus("processing");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Chưa đăng nhập");

      // 1. Tạo đơn hàng trong bảng public.orders
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: user.id,
            total_amount: finalTotal,
            shipping_address: `${userAddress.street_address}, ${userAddress.district}, ${userAddress.province_city}`,
            phone_contact: userProfile?.phone,
            receiver_name: userProfile?.name,
            address_id: userAddress.id,
            status: "pending", // Trạng thái chờ xử lý
            platform_voucher_id: selectedVoucher?.id || null,
            shipping_fee: shippingFee,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Lưu chi tiết sản phẩm vào public.order_items
      const orderItemsPayload = cartItems.map((item) => {
        // Kiểm tra ID sản phẩm. Nếu bạn fetch join products, ID thật nằm ở item.product_id
        const productId = Number(item.product_id);

        if (isNaN(productId)) {
          console.error("Lỗi: product_id không phải là số!", item);
        }

        return {
          order_id: orderData.id, // ID đơn hàng vừa tạo (bigint)
          product_id: productId, // ID sản phẩm (PHẢI LÀ SỐ - bigint)
          quantity: item.quantity,
          price_at_purchase: item.price,
          selected_variant: { color: item.color, size: item.size },
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsPayload);

      if (itemsError) throw itemsError;

      // 3. Xóa các món đã mua khỏi giỏ hàng
      const { error: deleteCartError } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
        .eq("is_selected", true);

      if (deleteCartError) throw deleteCartError;

      // Thành công
      setPaymentStatus("success");
    } catch (error: any) {
      console.error("Lỗi đặt hàng:", error.message);
      setPaymentStatus("error");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtnHeader}
        >
          <ChevronLeft size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thanh toán</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Khối thông tin người dùng */}
        <View style={styles.section}>
          {/* Địa chỉ giao hàng */}
          {renderInfoCard(
            "Địa chỉ giao hàng",
            userAddress
              ? `${userAddress.street_address}, ${userAddress.district}, ${userAddress.province_city}`
              : "Chưa có địa chỉ giao hàng",
          )}

          {/* Thông tin liên hệ (Dữ liệu từ người nhận của địa chỉ đó) */}
          {renderInfoCard(
            "Thông tin liên hệ",
            userProfile?.phone || "Chưa có số điện thoại",
            userProfile?.name, // Hiển thị tên người nhận ở dòng dưới
          )}
        </View>

        {/* Khối sản phẩm */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleWithBadge}>
              <Text style={styles.sectionHeaderTitleText}>Giỏ hàng</Text>
              <View style={styles.badgeCountGray}>
                <Text style={styles.badgeCountTextGray}>
                  {cartItems.length}
                </Text>
              </View>
            </View>
            {selectedVoucher && (
              <TouchableOpacity
                style={styles.discountBadgePurple}
                onPress={() => setSelectedVoucher(null)}
              >
                <Text style={styles.discountBadgeText}>
                  {selectedVoucher.type === "percentage"
                    ? `Giảm ${selectedVoucher.discount}%`
                    : `Giảm ${selectedVoucher.discount.toLocaleString("vi-VN")}₫`}
                </Text>
                <X color="#FFF" size={14} />
              </TouchableOpacity>
            )}
            {!selectedVoucher && (
              <TouchableOpacity
                style={styles.addVoucherBtnMini}
                onPress={() => setShowVouchers(true)}
              >
                <Plus size={16} color={C.blue} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <Text style={{ padding: 20, textAlign: "center", color: C.sub }}>
              Đang tải sản phẩm...
            </Text>
          ) : cartItems.length > 0 ? (
            cartItems.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.itemImage}
                  />
                  <View style={styles.itemQuantityBadge}>
                    <Text style={styles.itemQuantityText}>{item.quantity}</Text>
                  </View>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>
                    Phân loại: {item.color}, {item.size}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ padding: 20, textAlign: "center", color: C.sub }}>
              Không có sản phẩm để thanh toán
            </Text>
          )}
        </View>

        {/* Khối tổng kết chi phí */}
        <View style={styles.section}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tạm tính</Text>
            <Text style={styles.summaryValue}>
              {productsTotal.toLocaleString("vi-VN")}₫
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
            <Text style={styles.summaryValue}>
              {shippingFee.toLocaleString("vi-VN")}₫
            </Text>
          </View>
          {selectedVoucher && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Giảm giá ({selectedVoucher.discount}%)
              </Text>
              <Text style={[styles.summaryValue, { color: "#EF4444" }]}>
                -{discountAmount.toLocaleString("vi-VN")}₫
              </Text>
            </View>
          )}
        </View>
        {/* Khối tùy chọn giao hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitleText}>Tùy chọn giao hàng</Text>

          {shippingMethods.length > 0 ? (
            shippingMethods.map((method) => {
              const isSelected = selectedShippingId === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.shippingBtn,
                    isSelected && styles.shippingBtnActive,
                  ]}
                  onPress={() => setSelectedShippingId(method.id)}
                >
                  <View style={styles.shippingLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxActive,
                      ]}
                    >
                      {isSelected && <Check color="#FFFFFF" size={14} />}
                    </View>
                    <Text style={styles.shippingTitle}>{method.name}</Text>
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeText}>
                        {method.min_time}-{method.max_time} {method.unit}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.shippingPrice}>
                    {method.price === 0
                      ? "Miễn phí"
                      : `${Number(method.price).toLocaleString("vi-VN")}₫`}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={{ padding: 10, color: C.sub }}>
              Đang tải phương thức vận chuyển...
            </Text>
          )}

          {selectedMethod && (
            <Text style={styles.shippingFootnote}>
              Dự kiến nhận hàng sau {selectedMethod.max_time}{" "}
              {selectedMethod.unit} kể từ ngày đặt.
            </Text>
          )}
        </View>

        {/* Khối Phương thức thanh toán */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentSectionTitle}>Phương thức thanh toán</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={styles.paymentList}
            snapToInterval={SCREEN_WIDTH * 0.75 + 16}
          >
            {PAYMENT_METHODS.map((method) => {
              const isSelected = selectedPaymentId === method.id;

              return (
                <TouchableOpacity
                  key={method.id}
                  activeOpacity={0.9}
                  style={[
                    styles.paymentCard,
                    { backgroundColor: method.bgColor },
                  ]}
                  onPress={() => setSelectedPaymentId(method.id)}
                >
                  {/* Header thẻ */}
                  <View style={styles.cardHeader}>
                    {method.logo ? (
                      <Image
                        source={{ uri: method.logo }}
                        style={styles.cardLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      method.icon &&
                      React.createElement(method.icon as any, {
                        color: C.blue,
                        size: 32,
                      })
                    )}
                    <View style={styles.settingsBtn}>
                      <Settings size={14} color={C.blue} />
                    </View>
                  </View>

                  {/* Badge chọn */}
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <CheckCircle2 size={24} color={C.blue} fill="#FFF" />
                    </View>
                  )}

                  {/* Nội dung thẻ */}
                  <View style={styles.cardContentBottom}>
                    <Text
                      style={[
                        styles.cardNumber,
                        method.type === "Cash" && { fontSize: 16 },
                      ]}
                    >
                      {method.number}
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardHolder}>
                        {method.type === "Cash" ? method.name : method.holder}
                      </Text>
                      {method.expiry && (
                        <Text style={styles.cardExpiry}>{method.expiry}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Nút thêm thẻ mới */}
            <TouchableOpacity style={styles.addCardBtn} activeOpacity={0.8}>
              <Plus size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Thanh tổng tiền và nút thanh toán cố định */}
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Tổng cộng </Text>
          <Text style={styles.totalValue}>
            {finalTotal.toLocaleString("vi-VN")}₫
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.payButton,
            (loading || cartItems.length === 0) && { backgroundColor: C.sub },
          ]}
          activeOpacity={0.9}
          onPress={handlePlaceOrder} // 👈 Thay đổi từ setPaymentStatus sang handlePlaceOrder
          disabled={
            loading || cartItems.length === 0 || paymentStatus === "processing"
          }
        >
          <Text style={styles.payButtonText}>
            {paymentStatus === "processing" ? "Đang xử lý..." : "Thanh toán"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Trạng thái Thanh toán */}
      <Modal
        visible={paymentStatus !== "idle"}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.statusModalOverlay}>
          <View style={styles.statusModalContent}>
            {paymentStatus === "processing" && (
              <>
                <View style={styles.statusIconContainer}>
                  <View style={styles.loadingCircle}>
                    <ActivityIndicator size="large" color={C.blue} />
                  </View>
                </View>
                <Text style={styles.statusTitle}>Đang xử lý thanh toán</Text>
                <Text style={styles.statusDesc}>
                  Vui lòng đợi trong giây lát
                </Text>
              </>
            )}

            {paymentStatus === "success" && (
              <>
                <View
                  style={[
                    styles.statusIconContainer,
                    { backgroundColor: "#E6F6F0" },
                  ]}
                >
                  <CheckCircle2 size={60} color={C.blue} />
                </View>
                <Text style={styles.statusTitle}>Thành công!</Text>
                <Text style={styles.statusDesc}>
                  Thanh toán của bạn đã được ghi nhận
                </Text>
                <TouchableOpacity
                  style={styles.trackOrderBtn}
                  onPress={
                    () =>
                      router.push(
                        "/to-receive",
                      ) /* Điều hướng đến trang theo dõi đơn hàng */
                  }
                  // onPress={() => setPaymentStatus("idle")}
                >
                  <Text style={styles.trackOrderText}>Theo dõi đơn hàng</Text>
                </TouchableOpacity>
              </>
            )}

            {paymentStatus === "error" && (
              <>
                <View
                  style={[
                    styles.statusIconContainer,
                    { backgroundColor: "#FEE2E2" },
                  ]}
                >
                  <AlertCircle size={60} color={C.error} />
                </View>
                <Text style={styles.statusTitle}>Thanh toán thất bại</Text>
                <Text style={styles.statusDesc}>
                  Vui lòng đổi phương thức hoặc thử lại sau
                </Text>
                <View style={styles.errorActions}>
                  <TouchableOpacity
                    style={styles.tryAgainBtn}
                    onPress={() => setPaymentStatus("processing")}
                  >
                    <Text style={styles.tryAgainText}>Thử lại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.changeMethodBtn}
                    onPress={() => setPaymentStatus("idle")}
                  >
                    <Text style={styles.changeMethodText}>Thay đổi</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal hiển thị danh sách mã giảm giá */}
      <Modal
        visible={showVouchers}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVouchers(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowVouchers(false)}
        />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Mã giảm giá khả dụng</Text>
            <TouchableOpacity onPress={() => setShowVouchers(false)}>
              <X color="#000" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.voucherList}
            showsVerticalScrollIndicator={false}
          >
            {/* SỬA TẠI ĐÂY: Dùng dbVouchers thay vì VOUCHERS hoặc mảng cũ */}
            {dbVouchers && dbVouchers.length > 0 ? (
              dbVouchers.map((voucher) => {
                const IconComp = voucher.icon;
                const isSelected = selectedVoucher?.id === voucher.id;

                return (
                  <View key={voucher.id} style={styles.voucherCard}>
                    <View style={styles.voucherHeader}>
                      <Text style={styles.voucherLabel}>
                        Mã: {voucher.title}
                      </Text>
                      <View style={styles.expiryBadge}>
                        <Text style={styles.expiryLabel}>
                          Hạn dùng: {voucher.validUntil}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dashedLine} />
                    <View style={[styles.cutout, styles.cutoutLeft]} />
                    <View style={[styles.cutout, styles.cutoutRight]} />

                    <View style={styles.voucherContent}>
                      <View style={styles.voucherInfoRow}>
                        <IconComp color={COLORS.primary} size={20} />
                        <Text style={styles.voucherTitle}>
                          {voucher.type === "percentage"
                            ? `Giảm ${voucher.discount}%`
                            : `Giảm ${voucher.discount.toLocaleString("vi-VN")}đ`}
                        </Text>
                      </View>
                      <Text style={styles.voucherDesc}>
                        {voucher.description}
                      </Text>

                      <TouchableOpacity
                        style={[
                          styles.applyBtn,
                          isSelected && { backgroundColor: COLORS.primary },
                        ]}
                        onPress={() => {
                          setSelectedVoucher(voucher);
                          setShowVouchers(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.applyText,
                            isSelected && { color: "#FFF" },
                          ]}
                        >
                          {isSelected ? "Đã áp dụng" : "Áp dụng ngay"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              /* Thông báo này chỉ hiện khi dbVouchers thực sự rỗng */
              <View style={{ padding: 40, alignItems: "center" }}>
                <ShoppingBag
                  size={48}
                  color={C.sub}
                  style={{ marginBottom: 16, opacity: 0.5 }}
                />
                <Text style={{ color: C.sub, textAlign: "center" }}>
                  Hiện chưa có mã giảm giá nào dành cho bạn
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Chân của Bottom Sheet */}
          <View style={styles.sheetFooter}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Tổng cộng </Text>
              <Text style={styles.totalValue}>
                {finalTotal.toLocaleString("vi-VN")}₫
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.payButton,
                (loading || cartItems.length === 0) && {
                  backgroundColor: C.sub,
                },
              ]}
              activeOpacity={0.9}
              onPress={() => setShowVouchers(false)}
            >
              <Text style={styles.payButtonText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: C.text, flex: 1 },
  backBtnHeader: { paddingRight: 4 },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionHeaderTitleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.secondary,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBFB",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 4,
  },
  cardContent: {
    fontSize: 13,
    color: "#555",
  },
  cardSubContent: {
    fontSize: 13,
    color: "#555",
    marginTop: 2,
  },
  editButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeCount: {
    width: 34,
    height: 34,
    backgroundColor: COLORS.grayBadge,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeCountText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  addVoucherBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addVoucherText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  imageContainer: {
    position: "relative",
    marginRight: 15,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F0F0",
  },
  itemQuantityBadge: {
    position: "absolute",
    top: 0,
    right: -4,
    backgroundColor: COLORS.grayBadge,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  itemQuantityText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#000",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: "#555",
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginLeft: 10,
  },
  shippingBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FAFBFB",
    borderRadius: 12,
    marginBottom: 12,
  },
  shippingBtnActive: {
    backgroundColor: "#EAEBFF",
  },
  shippingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  shippingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  timeBadge: {
    backgroundColor: "#FFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
  shippingPrice: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.secondary,
  },
  shippingFootnote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 20,
    marginTop: 4,
  },
  paymentTag: {
    backgroundColor: "#EAEBFF",
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  paymentTagText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 15,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  totalContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.secondary,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.secondary,
  },
  payButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
  },
  payButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Phong cách hiển thị của Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.7,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
  },
  voucherList: {
    paddingHorizontal: 24,
  },
  voucherCard: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    backgroundColor: COLORS.voucherBg,
    marginBottom: 15,
    position: "relative",
    overflow: "hidden",
  },
  voucherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    zIndex: 2,
  },
  voucherLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  expiryBadge: {
    backgroundColor: COLORS.expiryBadge,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiryLabel: {
    fontSize: 12,
    color: "#000",
    fontWeight: "500",
  },
  dashedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: "#CCC",
    borderStyle: "dashed",
    marginHorizontal: 12,
    zIndex: 2,
  },
  cutout: {
    position: "absolute",
    top: 50,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: COLORS.primary,
    zIndex: 10,
  },
  cutoutLeft: {
    left: -9,
  },
  cutoutRight: {
    right: -9,
  },
  voucherContent: {
    padding: 16,
  },
  voucherInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  voucherDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-end",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  sheetFooter: {
    backgroundColor: "#F0F4FF",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  editButtonCircleLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF", // Blue tint
    justifyContent: "center",
    alignItems: "center",
  },
  badgeCountGray: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeCountTextGray: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  discountBadgePurple: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C7D2FE", // Purple/Blue pastel
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  discountBadgeText: {
    color: C.blue,
    fontWeight: "700",
    fontSize: 13,
  },
  addVoucherBtnMini: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  // ── Payment Section Styles ──
  paymentSection: {
    marginBottom: 40,
  },
  paymentSectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 28,
    paddingHorizontal: 0,
  },
  paymentList: {
    paddingTop: 12, // Thêm padding để hiển thị dấu tích không bị che
    paddingRight: 20,
    gap: 16,
  },
  paymentCard: {
    width: SCREEN_WIDTH * 0.75,
    aspectRatio: 1.586,
    borderRadius: 24,
    padding: 24,
    justifyContent: "space-between",
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardLogo: {
    width: 60,
    height: 35,
  },
  settingsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedBadge: {
    position: "absolute",
    top: -10,
    right: -10,
    zIndex: 10,
  },
  cardContentBottom: {
    gap: 12,
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 2,
    color: COLORS.secondary,
    fontFamily: "monospace",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHolder: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  cardExpiry: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  addCardBtn: {
    width: 80,
    aspectRatio: 0.6,
    backgroundColor: C.blue,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  // ── Status Modal Styles ──
  statusModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  statusModalContent: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 35,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  statusIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.secondary,
    textAlign: "center",
    marginBottom: 12,
  },
  statusDesc: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  trackOrderBtn: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  trackOrderText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  errorActions: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  tryAgainBtn: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  tryAgainText: {
    color: "#FFF",
    fontWeight: "700",
  },
  changeMethodBtn: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  changeMethodText: {
    color: COLORS.secondary,
    fontWeight: "700",
  },
});
