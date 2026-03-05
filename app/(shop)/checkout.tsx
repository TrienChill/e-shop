import { supabase } from "@/src/lib/supabase";
import { useRouter } from "expo-router";
import {
  Check,
  ChevronLeft,
  Gift,
  Pencil,
  ShoppingBag,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
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

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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

export default function CheckoutScreen() {
  const router = useRouter();
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">(
    "standard",
  );
  const [showVouchers, setShowVouchers] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);

  // Hàm hiển thị các thẻ thông tin (Địa chỉ, Liên hệ)
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
            content.includes("Chưa") && { color: "#EF4444" }, // Đỏ nếu chưa có dữ liệu
          ]}
        >
          {content}
        </Text>
        {subContent && <Text style={styles.cardSubContent}>{subContent}</Text>}
      </View>
      <TouchableOpacity
        style={styles.editButtonCircle}
        activeOpacity={0.8}
        onPress={() => router.push("/(shop)/(tabs)/cart")} // Quay lại giỏ hàng để sửa địa chỉ
      >
        <Pencil color="#FFFFFF" size={16} />
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
  const shippingFee = shippingMethod === "express" ? 250000 : 0;

  const discountAmount = selectedVoucher
    ? selectedVoucher.type === "percentage"
      ? (productsTotal * selectedVoucher.discount) / 100
      : selectedVoucher.discount // Nếu là số tiền mặt thì trừ trực tiếp
    : 0;
  // Đảm bảo số tiền giảm không vượt quá tổng đơn
  const finalDiscount = Math.min(discountAmount, productsTotal);
  const finalTotal = productsTotal + shippingFee - finalDiscount;

  // Thêm State để lưu voucher từ database
  const [dbVouchers, setDbVouchers] = useState<any[]>([]);

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
        console.log("Voucher Debug: Bắt đầu fetch voucher...");
        const { data: voucherData, error: voucherError } = await supabase
          .from("vouchers")
          .select("*")
          .eq("is_active", true) // Chỉ lấy voucher đang hoạt động
          .gt("expired_at", new Date().toISOString()) // SỬA: expiry_date -> expired_at
          .order("discount_value", { ascending: false }); // SỬA: discount_percent -> discount_value

        if (voucherError) {
          console.error("Voucher Debug: Lỗi Supabase:", voucherError);
        }

        if (voucherData && voucherData.length > 0) {
          console.log("Voucher Debug: Dữ liệu thô từ DB:", voucherData);

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
          console.log(
            "Voucher Debug: Dữ liệu sau khi format:",
            formattedVouchers,
          );
          setDbVouchers(formattedVouchers);
        } else {
          console.log("Voucher Debug: Không tìm thấy voucher nào (data null)");
        }

        if (cartData) {
          const formattedItems = cartData.map((item: any) => {
            const p = item.products;
            // Logic lấy ảnh theo màu sắc tương tự màn hình Cart
            const colorOpt = p.variants?.options?.find(
              (o: any) => o.color === item.color,
            );
            const imgIdx = colorOpt?.image_index ?? 0;
            const imageName = p.images?.[imgIdx] || p.images?.[0];

            const imageUrl = imageName?.startsWith("http")
              ? imageName
              : `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-imagess/${imageName}`;

            return {
              id: item.id,
              name: p.name,
              price: p.price,
              quantity: item.quantity,
              image: imageUrl,
              color: item.color,
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
              <Text style={styles.sectionHeaderTitleText}>Sản phẩm</Text>
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{cartItems.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addVoucherBtn}
              onPress={() => setShowVouchers(true)}
            >
              <Text style={styles.addVoucherText}>
                {selectedVoucher
                  ? `Giảm ${selectedVoucher.discount}%`
                  : "Mã giảm giá"}
              </Text>
            </TouchableOpacity>
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

          <TouchableOpacity
            style={[
              styles.shippingBtn,
              shippingMethod === "standard" && styles.shippingBtnActive,
            ]}
            onPress={() => setShippingMethod("standard")}
          >
            <View style={styles.shippingLeft}>
              <View
                style={[
                  styles.checkbox,
                  shippingMethod === "standard" && styles.checkboxActive,
                ]}
              >
                {shippingMethod === "standard" && (
                  <Check color="#FFFFFF" size={14} />
                )}
              </View>
              <Text style={styles.shippingTitle}>Tiêu chuẩn</Text>
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>5-7 ngày</Text>
              </View>
            </View>
            <Text style={styles.shippingPrice}>Miễn phí</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.shippingBtn,
              shippingMethod === "express" && styles.shippingBtnActive,
            ]}
            onPress={() => setShippingMethod("express")}
          >
            <View style={styles.shippingLeft}>
              <View
                style={[
                  styles.checkbox,
                  shippingMethod === "express" && styles.checkboxActive,
                ]}
              >
                {shippingMethod === "express" && (
                  <Check color="#FFFFFF" size={14} />
                )}
              </View>
              <Text style={styles.shippingTitle}>Hỏa tốc</Text>
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>1-2 ngày</Text>
              </View>
            </View>
            <Text style={styles.shippingPrice}>250.000₫</Text>
          </TouchableOpacity>

          <Text style={styles.shippingFootnote}>
            Dự kiến nhận hàng trước Thứ Năm, 23/04/2026
          </Text>
        </View>

        {/* Phương thức thanh toán */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderTitleText}>
              Phương thức thanh toán
            </Text>
            <TouchableOpacity
              style={styles.editButtonCircle}
              activeOpacity={0.8}
            >
              <Pencil color="#FFFFFF" size={16} />
            </TouchableOpacity>
          </View>
          <View style={styles.paymentTag}>
            <Text style={styles.paymentTagText}>Thẻ</Text>
          </View>
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
          disabled={loading || cartItems.length === 0}
        >
          <Text style={styles.payButtonText}>Thanh toán</Text>
        </TouchableOpacity>
      </View>

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
});
