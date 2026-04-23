import AddressEditModal from "@/src/components/checkout/AddressEditModal";
import ShippingOptions from "@/src/components/checkout/ShippingOptions";
import PriceDisplay from "@/src/components/common/PriceDisplay";
import VoucherCollection from "@/src/components/common/VoucherCollection";
import WebHeader from "@/src/components/web/WebHeader";
import { supabase } from "@/src/lib/supabase";
import {
  calculateDiscountedPrice,
  COLOR_TRANSLATIONS,
  getProductImageByColor,
} from "@/src/services/product";
import { useSupabaseRealtime } from "@/src/services/useSupabaseRealtime";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gift,
  Pencil,
  ShoppingBag,
  X
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = {
  primary: "#0055FF",
  secondary: "#1A1A1A",
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
  blue: "#0055FF",
  white: "#FFFFFF",
  success: "#4ADE80",
  error: "#EF4444",
};

export default function CheckoutScreen() {
  const router = useRouter();

  const [showVouchers, setShowVouchers] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");

  const [userAddress, setUserAddress] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [customerDistrictId, setCustomerDistrictId] = useState<number | null>(null);
  const [customerWardCode, setCustomerWardCode] = useState<string | null>(null);
  const [dynamicShippingFee, setDynamicShippingFee] = useState<number>(0);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useSupabaseRealtime({
    table: 'user_addresses',
    onUpdate: () => setRefreshTrigger(prev => prev + 1)
  });
  useSupabaseRealtime({
    table: 'cart_items',
    onUpdate: () => setRefreshTrigger(prev => prev + 1)
  });
  useSupabaseRealtime({
    table: 'vouchers',
    onUpdate: () => setRefreshTrigger(prev => prev + 1)
  });

  const [dbVouchers, setDbVouchers] = useState<any[]>([]);
  const [userMembership, setUserMembership] = useState<any>(null);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [allAddresses, setAllAddresses] = useState<any[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [editAddressData, setEditAddressData] = useState({
    id: null,
    name: "",
    phone: "",
    city: "",
    district: "",
    ward: "",
    street: "",
    isDefault: false,
    ghnDistrictId: null as number | null,
    ghnWardCode: null as string | null,
  });

  const productsTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const openAddAddress = () => {
    setEditAddressData({
      id: null,
      name: "",
      phone: "",
      city: "",
      district: "",
      ward: "",
      street: "",
      isDefault: allAddresses.length === 0,
      ghnDistrictId: null,
      ghnWardCode: null,
    });
    setEditModalVisible(true);
  };

  const openEditAddress = (addr: any) => {
    setEditAddressData({
      id: addr.id,
      name: addr.receiver_name || "",
      phone: addr.phone_number || "",
      city: addr.province_city || "",
      district: addr.district || "",
      ward: addr.ward_commune || "",
      street: addr.street_address || "",
      isDefault: addr.is_default || false,
      ghnDistrictId: addr.ghn_district_id ? Number(addr.ghn_district_id) : null,
      ghnWardCode: addr.ghn_ward_code ? String(addr.ghn_ward_code) : null,
    });
    setEditModalVisible(true);
  };

  const reloadAddresses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: addresses } = await supabase
        .from("user_addresses")
        .select("id, receiver_name, phone_number, province_city, district, ward_commune, street_address, ghn_district_id, ghn_ward_code, is_default")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      if (addresses && addresses.length > 0) {
        setAllAddresses(addresses);
        const currentStillExists = addresses.find(a => a.id === userAddress?.id);
        if (!currentStillExists) {
          handleSelectAddress(addresses[0]);
        } else {
          const updatedCurrent = addresses.find(a => a.id === userAddress?.id);
          if (updatedCurrent) handleSelectAddress(updatedCurrent);
        }
      } else {
        setAllAddresses([]);
        setUserAddress(null);
      }
    } catch (error) {
      console.error("Lỗi reload địa chỉ", error);
    }
  };

  const handleSaveAddress = async () => {
    if (!editAddressData.name.trim() || !editAddressData.phone.trim()) {
      alert("Vui lòng điền đủ Họ tên và Số điện thoại");
      return;
    }

    setSavingAddress(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Vui lòng đăng nhập để lưu địa chỉ");
        return;
      }

      if (editAddressData.isDefault) {
        await supabase
          .from("user_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const payload = {
        user_id: user.id,
        receiver_name: editAddressData.name,
        phone_number: editAddressData.phone,
        province_city: editAddressData.city,
        district: editAddressData.district,
        ward_commune: editAddressData.ward,
        street_address: editAddressData.street,
        is_default: editAddressData.isDefault,
        ghn_district_id: editAddressData.ghnDistrictId,
        ghn_ward_code: editAddressData.ghnWardCode,
        updated_at: new Date(),
      };

      const finalPayload = editAddressData.id ? { ...payload, id: editAddressData.id } : payload;

      const { error } = await supabase
        .from("user_addresses")
        .upsert(finalPayload)
        .select()
        .single();

      if (error) throw error;

      await reloadAddresses();
      setEditModalVisible(false);
      alert("Lưu địa chỉ thành công!");
    } catch (error: any) {
      alert("Không thể lưu địa chỉ: " + error.message);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSelectAddress = (addr: any) => {
    setUserAddress(addr);
    setUserProfile({
      name: addr.receiver_name,
      phone: addr.phone_number,
      email: userProfile?.email || "",
    });

    if (addr.ghn_district_id) setCustomerDistrictId(Number(addr.ghn_district_id));
    if (addr.ghn_ward_code) setCustomerWardCode(String(addr.ghn_ward_code));

    setShowAddressModal(false);
  };

  const shippingFee = dynamicShippingFee;

  let discountAmount = 0;
  if (selectedVoucher) {
    if (selectedVoucher.type === "percentage") {
      let calc = (productsTotal * selectedVoucher.discount) / 100;
      if (selectedVoucher.maxDiscount > 0) {
        calc = Math.min(calc, selectedVoucher.maxDiscount);
      }
      discountAmount = calc;
    } else {
      discountAmount = selectedVoucher.discount;
    }
  }

  const membershipDiscount = userMembership && userMembership.benefit_percentage > 0
    ? Math.round((productsTotal * userMembership.benefit_percentage) / 100)
    : 0;

  const finalDiscount = Math.min(discountAmount, productsTotal);
  const totalDiscount = finalDiscount + membershipDiscount;
  const finalTotal = productsTotal + shippingFee - totalDiscount;

  useEffect(() => {
    if (paymentStatus === "processing") {
      const timer = setTimeout(() => {
        setPaymentStatus("success");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus]);

  useEffect(() => {
    const fetchCheckoutInfo = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: addresses } = await supabase
          .from("user_addresses")
          .select("id, receiver_name, phone_number, province_city, district, ward_commune, street_address, ghn_district_id, ghn_ward_code, is_default")
          .eq("user_id", user.id)
          .order('is_default', { ascending: false });

        if (addresses && addresses.length > 0) {
          setAllAddresses(addresses);
          const defaultAddr = addresses[0];

          setUserProfile({
            name: defaultAddr.receiver_name,
            phone: defaultAddr.phone_number,
            email: user.email,
          });
          setUserAddress(defaultAddr);

          if (defaultAddr.ghn_district_id) setCustomerDistrictId(Number(defaultAddr.ghn_district_id));
          if (defaultAddr.ghn_ward_code) setCustomerWardCode(String(defaultAddr.ghn_ward_code));
        } else {
          setAllAddresses([]);
        }

        const { data: cartData } = await supabase
          .from("cart_items")
          .select(`
            id,
            product_id,
            quantity,
            color,
            size,
            products (
              name,
              price,
              images,
              variants,
              product_discounts (
                id, discount_type, discount_value, is_active, start_date, end_date
              )
            )
          `)
          .eq("user_id", user.id)
          .eq("is_selected", true);

        const { data: rawUserVoucherData, error: voucherErr } = await supabase
          .from("user_vouchers")
          .select(`
            id,
            is_used,
            vouchers!inner (
              id, code, discount_type, discount_value, min_order_value, max_discount, expired_at, is_active, usage_limit, used_count
            )
          `)
          .eq("user_id", user.id)
          .eq("is_used", false)
          .eq("vouchers.is_active", true);

        if (voucherErr) {
          console.error("Lỗi fetch voucher:", voucherErr);
        }

        const userVoucherData = rawUserVoucherData?.filter((uv: any) => {
          if (!uv.vouchers.expired_at) return true;
          return new Date(uv.vouchers.expired_at) > new Date();
        });

        if (userVoucherData && userVoucherData.length > 0) {
          const formattedVouchers = userVoucherData.map((uv: any) => {
            const v = uv.vouchers;
            return {
              id: v.id,
              user_voucher_id: uv.id,
              title: v.code,
              description: v.discount_type === "percentage"
                ? `Giảm ${v.discount_value}%${v.max_discount ? ` tối đa ${v.max_discount.toLocaleString("vi-VN")}đ` : ''} cho đơn hàng`
                : `Giảm ${v.discount_value.toLocaleString("vi-VN")}đ cho đơn hàng`,
              validUntil: v.expired_at ? new Date(v.expired_at).toLocaleDateString("vi-VN") : "Không thời hạn",
              discount: Number(v.discount_value),
              type: v.discount_type,
              minOrderValue: Number(v.min_order_value || 0),
              maxDiscount: Number(v.max_discount || 0),
              usageLimit: v.usage_limit,
              usedCount: v.used_count || 0,
              icon: Number(v.discount_value) > 10 ? Gift : ShoppingBag,
            };
          });

          setDbVouchers(formattedVouchers);
        }

        if (cartData) {
          const formattedItems = cartData.map((item: any) => {
            const p = item.products;
            const withDiscount = calculateDiscountedPrice(p);

            return {
              id: item.id,
              product_id: item.product_id,
              name: p.name,
              price: withDiscount.finalPrice,
              originalPrice: withDiscount.originalPrice,
              hasDiscount: withDiscount.hasDiscount,
              quantity: item.quantity,
              image: getProductImageByColor(p, item.color),
              color: COLOR_TRANSLATIONS[item.color] || item.color,
              size: item.size,
              rawColor: item.color,
              rawSize: item.size,
            };
          });
          setCartItems(formattedItems);
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select(`
            id,
            membership_levels (
              id,
              level_name,
              benefit_percentage,
              min_spending
            )
          `)
          .eq("id", user.id)
          .single();

        if (profileData?.membership_levels) {
          setUserMembership(profileData.membership_levels);
        }
      } catch (err) {
        console.error("Lỗi fetch checkout:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutInfo();
  }, [refreshTrigger]);

  const handlePlaceOrder = async () => {
    if (!userAddress || cartItems.length === 0) {
      setPaymentStatus("idle");
      alert("Vui lòng kiểm tra lại địa chỉ và giỏ hàng!");
      return;
    }

    if (!userAddress.ghn_district_id || !userAddress.ghn_ward_code) {
      setPaymentStatus("idle");
      alert(
        "Địa chỉ giao hàng chưa được cập nhật theo chuẩn mới.\n\n" +
        "Vui lòng vào Cài đặt → Địa chỉ giao hàng → Chỉnh sửa lại địa chỉ " +
        "và chọn lại Quận/Huyện, Phường/Xã từ danh sách."
      );
      return;
    }

    setPaymentStatus("processing");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Chưa đăng nhập");

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: user.id,
            total_amount: finalTotal,
            shipping_address: `${userAddress.street_address}, ${userAddress.district}, ${userAddress.province_city}`,
            full_shipping_address: `${userAddress.street_address}, ${userAddress.ward_commune ? userAddress.ward_commune + ', ' : ''}${userAddress.district}, ${userAddress.province_city}`,
            phone_contact: userProfile?.phone,
            receiver_name: userProfile?.name,
            receiver_phone: userProfile?.phone,
            address_id: userAddress.id,
            status: "pending",
            platform_voucher_id: selectedVoucher?.id || null,
            discount_amount: finalDiscount,
            shipping_fee: shippingFee,
            shipping_method_id: selectedShippingId,
            shipping_district_id: userAddress.ghn_district_id ? Number(userAddress.ghn_district_id) : null,
            shipping_ward_code: userAddress.ghn_ward_code ? String(userAddress.ghn_ward_code) : null,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItemsPayload = cartItems.map((item) => {
        const productId = Number(item.product_id);
        if (isNaN(productId)) {
          console.error("Lỗi: product_id không phải là số!", item);
        }
        return {
          order_id: orderData.id,
          product_id: productId,
          quantity: item.quantity,
          price_at_purchase: item.price,
          selected_variant: { color: item.rawColor, size: item.rawSize },
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsPayload);

      if (itemsError) throw itemsError;

      for (const item of cartItems) {
        try {
          let query = supabase
            .from("product_variants")
            .select("id, stock")
            .eq("product_id", item.product_id);

          if (item.rawColor) query = query.eq("color", item.rawColor);
          else query = query.is("color", null);

          if (item.rawSize) query = query.eq("size", item.rawSize);
          else query = query.is("size", null);

          const { data: variant, error: vError } = await query.maybeSingle();

          if (vError) {
            console.error("[STOCK_CHECK] Lỗi tìm variant:", vError);
            continue;
          }

          if (variant) {
            const { error: rpcError } = await supabase.rpc("buy_product", {
              variant_id: variant.id,
              quantity_to_buy: item.quantity,
            });

            if (rpcError) {
              console.error(`[STOCK_CHECK] Lỗi RPC buy_product cho ${item.name}:`, rpcError.message);
              throw rpcError;
            }
          } else {
            console.warn(`[STOCK_CHECK] KHÔNG tìm thấy variant cho sản phẩm: ${item.name}`);
          }
        } catch (stockErr: any) {
          console.error("[STOCK_CHECK] Exception khi xử lý stock:", stockErr.message);
          throw stockErr;
        }
      }

      if (selectedVoucher?.user_voucher_id) {
        await supabase
          .from("user_vouchers")
          .update({
            is_used: true,
            used_at: new Date().toISOString(),
            order_id: orderData.id
          })
          .eq("id", selectedVoucher.user_voucher_id);

        try {
          const { data: vData } = await supabase
            .from("vouchers")
            .select("used_count")
            .eq("id", selectedVoucher.id)
            .single();

          if (vData) {
            await supabase
              .from("vouchers")
              .update({ used_count: (vData.used_count || 0) + 1 })
              .eq("id", selectedVoucher.id);
          }
        } catch (e) {
          console.error("Lỗi tăng used_count cho vouchers", e);
        }
      }

      const { error: deleteCartError } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
        .eq("is_selected", true);

      if (deleteCartError) throw deleteCartError;

      setPaymentStatus("success");
    } catch (error: any) {
      console.error("Lỗi đặt hàng:", error.message);
      setErrorMessage(error.message || "Đã có lỗi xảy ra");
      setPaymentStatus("error");
    }
  };

  // ── Responsive guard ──
  const { width: WINDOW_WIDTH } = useWindowDimensions();
  const IS_WEB_DESKTOP = Platform.OS === "web" && WINDOW_WIDTH >= 1024;

  // ── Main render with modals included ──
  return (
    <SafeAreaView style={IS_WEB_DESKTOP ? webStyles.safeArea : styles.container}>
      <StatusBar barStyle="dark-content" />

      {IS_WEB_DESKTOP ? (
        <>
          <WebHeader />
          <View style={webStyles.layout}>
            {/* Left column (70%): Form */}
            <ScrollView style={webStyles.leftCol} showsVerticalScrollIndicator={false} contentContainerStyle={webStyles.leftScrollContent}>
              {/* Header */}
              <View style={webStyles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={webStyles.backBtnHeader}>
                  <ChevronLeft size={28} color={C.text} />
                </TouchableOpacity>
                <Text style={webStyles.headerTitle}>Thanh toán</Text>
              </View>

              {/* Address section */}
              <View style={webStyles.addressCard}>
                <View style={webStyles.addressCardHeader}>
                  <Text style={webStyles.addressCardTitle}>Địa chỉ giao hàng</Text>
                  <TouchableOpacity onPress={() => setShowAddressModal(true)}>
                    <Text style={webStyles.changeAddressBtn}>Thay đổi</Text>
                  </TouchableOpacity>
                </View>
                {loading ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : userAddress ? (
                  <View>
                    <Text style={webStyles.receiverName}>{userAddress.receiver_name} | {userAddress.phone_number}</Text>
                    <Text style={webStyles.addressText}>
                      {userAddress.street_address}, {userAddress.ward_commune ? userAddress.ward_commune + ", " : ""}{userAddress.district}, {userAddress.province_city}
                    </Text>
                  </View>
                ) : (
                  <Text style={webStyles.noAddress}>Chưa có địa chỉ giao hàng.</Text>
                )}
              </View>

              {/* Shipping options */}
              <View style={webStyles.sectionBlock}>
                <Text style={webStyles.sectionTitle}>Phương thức vận chuyển</Text>
                <ShippingOptions
                  customerDistrictId={customerDistrictId}
                  customerWardCode={customerWardCode}
                  totalCartWeight={1500}
                  onSelectMethod={(serviceId, fee) => {
                    setSelectedShippingId(String(serviceId));
                    setDynamicShippingFee(fee);
                  }}
                />
              </View>

              {/* Payment method */}
              <View style={webStyles.sectionBlock}>
                <Text style={webStyles.sectionTitle}>Phương thức thanh toán</Text>
                <View style={webStyles.codCard}>
                  <View style={webStyles.codIconWrapper}>
                    <Banknote size={24} color={C.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={webStyles.codTitle}>Thanh toán khi nhận hàng (COD)</Text>
                    <Text style={webStyles.codSubtitle}>Thanh toán bằng tiền mặt khi giao hàng tận nơi</Text>
                  </View>
                  <CheckCircle2 size={22} color={C.blue} />
                </View>
              </View>
            </ScrollView>

            {/* Right column (30%): Order Summary */}
            <View style={webStyles.rightCol}>
              <View style={webStyles.stickySummary}>
                <Text style={webStyles.summaryTitle}>Tóm tắt đơn hàng</Text>

                {loading ? (
                  <ActivityIndicator size="small" color="#2563EB" style={{ alignSelf: "center", marginVertical: 20 }} />
                ) : cartItems.length > 0 ? (
                  cartItems.map((item) => (
                    <View key={item.id} style={webStyles.summaryItem}>
                      <View style={webStyles.summaryItemImgWrap}>
                        <Image source={{ uri: item.image }} style={webStyles.summaryItemImg} />
                        <View style={webStyles.summaryItemQtyBadge}>
                          <Text style={webStyles.summaryItemQty}>{item.quantity}</Text>
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={webStyles.summaryItemName} numberOfLines={2}>{item.name}</Text>
                        <Text style={webStyles.summaryItemMeta}>{item.color}, {item.size}</Text>
                      </View>
                      <PriceDisplay
                        originalPrice={item.originalPrice * item.quantity}
                        finalPrice={item.price * item.quantity}
                        hasDiscount={item.hasDiscount}
                        size="sm"
                        justify="flex-end"
                      />
                    </View>
                  ))
                ) : (
                  <Text style={{ color: C.sub, textAlign: "center", padding: 20 }}>Không có sản phẩm</Text>
                )}

                <View style={webStyles.summaryDivider} />
                <View style={webStyles.summaryRow}>
                  <Text style={webStyles.summaryLabel}>Tạm tính</Text>
                  <Text style={webStyles.summaryValue}>{productsTotal.toLocaleString("vi-VN")}₫</Text>
                </View>
                <View style={webStyles.summaryRow}>
                  <Text style={webStyles.summaryLabel}>Phí vận chuyển</Text>
                  <Text style={webStyles.summaryValue}>{shippingFee.toLocaleString("vi-VN")}₫</Text>
                </View>
                {selectedVoucher && (
                  <View style={webStyles.summaryRow}>
                    <Text style={webStyles.summaryLabel}>Giảm giá</Text>
                    <Text style={[webStyles.summaryValue, { color: "#EF4444" }]}>-{finalDiscount.toLocaleString("vi-VN")}₫</Text>
                  </View>
                )}
                {userMembership && userMembership.benefit_percentage > 0 && (
                  <View style={webStyles.summaryRow}>
                    <Text style={webStyles.summaryLabel}>Giảm thành viên ({userMembership.level_name})</Text>
                    <Text style={[webStyles.summaryValue, { color: "#22C55E" }]}>-{membershipDiscount.toLocaleString("vi-VN")}₫</Text>
                  </View>
                )}
                <View style={webStyles.summaryDivider} />
                <View style={webStyles.summaryRow}>
                  <Text style={webStyles.totalLabel}>Tổng cộng</Text>
                  <Text style={webStyles.totalValue}>{finalTotal.toLocaleString("vi-VN")}₫</Text>
                </View>

                {/* Voucher */}
                <TouchableOpacity
                  style={webStyles.voucherRow}
                  onPress={() => setShowVouchers(true)}
                  activeOpacity={0.8}
                >
                  <Gift size={20} color={COLORS.primary} />
                  <Text style={webStyles.voucherText}>
                    {selectedVoucher ? "Đã áp dụng mã giảm giá" : "Chọn mã giảm giá"}
                  </Text>
                  <ChevronRight size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>

                {/* Pay button */}
                <TouchableOpacity
                  style={[webStyles.payButton, (loading || cartItems.length === 0) && { backgroundColor: C.sub }]}
                  activeOpacity={0.9}
                  onPress={handlePlaceOrder}
                  disabled={loading || cartItems.length === 0 || paymentStatus === "processing"}
                >
                  <Text style={webStyles.payButtonText}>
                    {paymentStatus === "processing" ? "Đang xử lý..." : "Thanh toán"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      ) : (
        <>
          {/* ── Mobile Header ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtnHeader}>
              <ChevronLeft size={28} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Thanh toán</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Address block */}
            <View style={styles.addressBlock}>
              <View style={styles.addressBlockHeader}>
                <Text style={styles.addressBlockTitle}>Địa chỉ giao hàng</Text>
                <TouchableOpacity onPress={() => setShowAddressModal(true)} style={styles.changeAddressBtn}>
                  <Text style={styles.changeAddressBtnText}>Thay đổi</Text>
                </TouchableOpacity>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color="#2563EB" style={{ alignSelf: "flex-start" }} />
              ) : userAddress ? (
                <View>
                  <View style={styles.addressNameRow}>
                    <Text style={styles.addressName}>{userAddress.receiver_name}</Text>
                    <Text style={styles.addressPhone}>| {userAddress.phone_number}</Text>
                  </View>
                  <Text style={styles.addressDetail}>
                    {userAddress.street_address}, {userAddress.ward_commune ? `${userAddress.ward_commune}, ` : ''}{userAddress.district}, {userAddress.province_city}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noAddressText}>Hiện không có thông tin địa chỉ giao hàng.</Text>
              )}
            </View>

            {/* Cart items */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.titleWithBadge}>
                  <Text style={styles.sectionHeaderTitleText}>Giỏ hàng</Text>
                  <View style={styles.badgeCountGray}>
                    <Text style={styles.badgeCountTextGray}>{cartItems.length}</Text>
                  </View>
                </View>
              </View>
              {loading ? (
                <Text style={styles.loadingText}>Đang tải sản phẩm...</Text>
              ) : cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: item.image }} style={styles.itemImage} />
                      <View style={styles.itemQuantityBadge}>
                        <Text style={styles.itemQuantityText}>{item.quantity}</Text>
                      </View>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.itemMetaText}>Phân loại: {item.color}, {item.size}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <PriceDisplay
                        originalPrice={item.originalPrice * item.quantity}
                        finalPrice={item.price * item.quantity}
                        hasDiscount={item.hasDiscount}
                        size="sm"
                        justify="flex-end"
                      />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.loadingText}>Không có sản phẩm để thanh toán</Text>
              )}
            </View>

            {/* Summary */}
            <View style={styles.section}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tạm tính</Text>
                <Text style={styles.summaryValue}>{productsTotal.toLocaleString("vi-VN")}₫</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
                <Text style={styles.summaryValue}>{shippingFee.toLocaleString("vi-VN")}₫</Text>
              </View>
              {selectedVoucher && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Giảm giá ({selectedVoucher.type === "percentage" ? `${selectedVoucher.discount}%` : "Trực tiếp"})
                  </Text>
                  <Text style={[styles.summaryValue, { color: "#EF4444" }]}>-{finalDiscount.toLocaleString("vi-VN")}₫</Text>
                </View>
              )}
              {userMembership && userMembership.benefit_percentage > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Giảm thành viên ({userMembership.level_name} - {userMembership.benefit_percentage}%)
                  </Text>
                  <Text style={[styles.summaryValue, { color: "#22C55E" }]}>-{membershipDiscount.toLocaleString("vi-VN")}₫</Text>
                </View>
              )}
            </View>

            {/* Voucher selector */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.voucherSelectRow}
                onPress={() => setShowVouchers(true)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                  <View style={styles.voucherIconContainer}>
                    <Gift size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.voucherSelectTitle}>
                      {selectedVoucher ? "Mã giảm giá đã chọn" : "Mã giảm giá của bạn"}
                    </Text>
                    <Text style={styles.voucherSelectSubtitle}>
                      {selectedVoucher
                        ? (selectedVoucher.type === "percentage" ? `Đã áp dụng giảm ${selectedVoucher.discount}%` : `Đã áp dụng giảm ${selectedVoucher.discount.toLocaleString("vi-VN")}₫`)
                        : "Chọn hoặc nhập mã"}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Shipping */}
            <View style={styles.section}>
              <Text style={styles.sectionTitleText}>Phương thức vận chuyển</Text>
              <ShippingOptions
                customerDistrictId={customerDistrictId}
                customerWardCode={customerWardCode}
                totalCartWeight={1500}
                onSelectMethod={(serviceId, fee) => {
                  setSelectedShippingId(String(serviceId));
                  setDynamicShippingFee(fee);
                }}
              />
            </View>

            {/* Payment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitleText}>Phương thức thanh toán</Text>
              <View style={styles.codPaymentCard}>
                <View style={styles.codIconWrapper}>
                  <Banknote size={24} color={C.blue} />
                </View>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.codTitle}>Thanh toán khi nhận hàng (COD)</Text>
                  <Text style={styles.codSubtitle}>Thanh toán bằng tiền mặt khi giao hàng tận nơi</Text>
                </View>
                <View style={styles.codCheckMark}>
                  <CheckCircle2 size={22} color={C.blue} />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Tổng cộng </Text>
              <Text style={styles.totalValue}>{finalTotal.toLocaleString("vi-VN")}₫</Text>
            </View>
            <TouchableOpacity
              style={[styles.payButton, (loading || cartItems.length === 0) && { backgroundColor: C.sub }]}
              activeOpacity={0.9}
              onPress={handlePlaceOrder}
              disabled={loading || cartItems.length === 0 || paymentStatus === "processing"}
            >
              <Text style={styles.payButtonText}>
                {paymentStatus === "processing" ? "Đang xử lý..." : "Thanh toán"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── All Modals ── */}
      {/* Payment status modal */}
      <Modal visible={paymentStatus !== "idle"} transparent={true} animationType="fade">
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
                <Text style={styles.statusDesc}>Vui lòng đợi trong giây lát</Text>
              </>
            )}
            {paymentStatus === "success" && (
              <>
                <View style={[styles.statusIconContainer, { backgroundColor: "#E6F6F0" }]}>
                  <CheckCircle2 size={60} color={C.blue} />
                </View>
                <Text style={styles.statusTitle}>Thành công!</Text>
                <Text style={styles.statusDesc}>Thanh toán của bạn đã được ghi nhận</Text>
                <TouchableOpacity style={styles.trackOrderBtn} onPress={() => {
                  setPaymentStatus("idle");
                  router.push("/to-receive");
                }}>
                  <Text style={styles.trackOrderText}>Theo dõi đơn hàng</Text>
                </TouchableOpacity>
              </>
            )}
            {paymentStatus === "error" && (
              <>
                <View style={[styles.statusIconContainer, { backgroundColor: "#FEE2E2" }]}>
                  <AlertCircle size={60} color={C.error} />
                </View>
                <Text style={styles.statusTitle}>Thanh toán thất bại</Text>
                <Text style={styles.statusDesc}>{errorMessage || "Vui lòng đổi phương thức hoặc thử lại sau"}</Text>
                <View style={styles.errorActions}>
                  <TouchableOpacity style={styles.tryAgainBtn} onPress={() => setPaymentStatus("processing")}>
                    <Text style={styles.tryAgainText}>Thử lại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.changeMethodBtn} onPress={() => setPaymentStatus("idle")}>
                    <Text style={styles.changeMethodText}>Thay đổi</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Address selection modal */}
      <Modal visible={showAddressModal} transparent={true} animationType="slide" onRequestClose={() => setShowAddressModal(false)}>
        <View style={webStyles.modalOverlay}>
          <Pressable style={webStyles.modalBackdrop} onPress={() => setShowAddressModal(false)} />
          <View style={webStyles.addressSheet}>
            <View style={webStyles.sheetHeader}>
              <View>
                <Text style={webStyles.sheetTitle}>Sổ địa chỉ của bạn</Text>
                <TouchableOpacity onPress={openAddAddress}>
                  <Text style={webStyles.addAddressLink}>+ Thêm địa chỉ mới</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setShowAddressModal(false)} style={webStyles.closeBtn}>
                <X color="#4B5563" size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {allAddresses.length > 0 ? (
                allAddresses.map((addr) => {
                  const isSelected = userAddress?.id === addr.id;
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      onPress={() => handleSelectAddress(addr)}
                      style={[webStyles.addressItem, isSelected && webStyles.addressItemSelected]}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={webStyles.addressNameRow}>
                          <Text style={webStyles.addressName}>{addr.receiver_name}</Text>
                          <Text style={webStyles.addressPhone}>| {addr.phone_number}</Text>
                          {addr.is_default && (
                            <View style={webStyles.defaultBadge}>
                              <Text style={webStyles.defaultBadgeText}>Mặc định</Text>
                            </View>
                          )}
                        </View>
                        <Text style={webStyles.addressDetail}>
                          {addr.street_address}, {addr.ward_commune ? `${addr.ward_commune}, ` : ''}{addr.district}, {addr.province_city}
                        </Text>
                      </View>
                      <View style={webStyles.addressActions}>
                        <TouchableOpacity onPress={() => openEditAddress(addr)} style={{ padding: 8 }}>
                          <Pencil size={18} color="#6B7280" />
                        </TouchableOpacity>
                        <View style={[webStyles.radio, isSelected && webStyles.radioSelected]}>
                          {isSelected && <View style={webStyles.radioDot} />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Text style={{ textAlign: "center", color: "#EF4444", fontWeight: "500" }}>
                    Không tìm thấy địa chỉ giao hàng nào!
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AddressEditModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        addressData={editAddressData}
        setAddressData={setEditAddressData}
        handleSaveAddress={handleSaveAddress}
        saving={savingAddress}
      />

      {/* Voucher modal */}
      <Modal visible={showVouchers} transparent={true} animationType="slide" onRequestClose={() => setShowVouchers(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowVouchers(false)} />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Mã giảm giá khả dụng</Text>
            <TouchableOpacity onPress={() => setShowVouchers(false)}>
              <X color="#000" size={24} />
            </TouchableOpacity>
          </View>
          <VoucherCollection onVoucherCollected={() => setRefreshTrigger(prev => prev + 1)} style={{ marginBottom: 8, marginTop: 4 }} />
          <ScrollView style={styles.voucherList} showsVerticalScrollIndicator={false}>
            {dbVouchers && dbVouchers.length > 0 ? (
              dbVouchers.map((voucher) => {
                const IconComp = voucher.icon;
                const isEligible = productsTotal >= voucher.minOrderValue;
                const isSelected = selectedVoucher?.id === voucher.id;
                const missingAmount = voucher.minOrderValue - productsTotal;

                return (
                  <View key={voucher.id} style={styles.voucherCard}>
                    <View style={styles.voucherHeader}>
                      <Text style={styles.voucherLabel}>Mã: {voucher.title}</Text>
                      <View style={styles.expiryBadge}>
                        <Text style={styles.expiryLabel}>Hạn dùng: {voucher.validUntil}</Text>
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
                            ? `Giảm ${voucher.discount}%${voucher.maxDiscount ? ` (Tối đa ${voucher.maxDiscount.toLocaleString("vi-VN")}đ)` : ''}`
                            : `Giảm ${voucher.discount.toLocaleString("vi-VN")}đ`}
                        </Text>
                      </View>
                      <Text style={[styles.voucherDesc, !isEligible && { marginBottom: 4 }]}>{voucher.description}</Text>
                      <View style={{ marginBottom: 12 }}>
                        {voucher.usageLimit ? (
                          <>
                            <View style={{ height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                              <View style={{ height: '100%', backgroundColor: COLORS.primary, width: `${Math.min(100, (voucher.usedCount / voucher.usageLimit) * 100)}%` }} />
                            </View>
                            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>
                              Đã dùng {voucher.usedCount}/{voucher.usageLimit} lượt (Còn {Math.max(0, voucher.usageLimit - voucher.usedCount)})
                            </Text>
                          </>
                        ) : (
                          <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>Lượt dùng vô hạn</Text>
                        )}
                      </View>
                      {!isEligible && missingAmount > 0 && (
                        <Text style={{ fontSize: 12, color: '#EF4444', marginBottom: 16, fontStyle: 'italic', fontWeight: "500" }}>
                          * Mua thêm {missingAmount.toLocaleString("vi-VN")}đ để sử dụng mã này
                        </Text>
                      )}
                      <TouchableOpacity
                        disabled={!isEligible}
                        style={[styles.applyBtn, !isEligible && { backgroundColor: '#E5E7EB' }, isSelected && { backgroundColor: COLORS.primary }]}
                        onPress={() => {
                          setSelectedVoucher(voucher);
                          setShowVouchers(false);
                        }}
                      >
                        <Text style={[styles.applyText, !isEligible && { color: '#9CA3AF' }, isSelected && { color: "#FFF" }]}>
                          {isSelected ? "Đã áp dụng" : (isEligible ? "Áp dụng ngay" : "Chưa đủ ĐK")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ShoppingBag size={48} color={C.sub} style={{ marginBottom: 16, opacity: 0.5 }} />
                <Text style={{ color: C.sub, textAlign: "center" }}>Hiện chưa có mã giảm giá nào dành cho bạn</Text>
              </View>
            )}
          </ScrollView>
          <View style={styles.sheetFooter}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Tổng cộng </Text>
              <Text style={styles.totalValue}>{finalTotal.toLocaleString("vi-VN")}₫</Text>
            </View>
            <TouchableOpacity
              style={[styles.payButton, (loading || cartItems.length === 0) && { backgroundColor: C.sub }]}
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
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 10 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: C.text, flex: 1 },
  backBtnHeader: { paddingRight: 4 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  titleWithBadge: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionHeaderTitleText: { fontSize: 20, fontWeight: "bold", color: COLORS.secondary },
  addressBlock: { backgroundColor: "#FAFBFB", padding: 18, borderRadius: 16, marginBottom: 24, marginTop: 8 },
  addressBlockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addressBlockTitle: { fontSize: 18, fontWeight: "700", color: COLORS.secondary },
  changeAddressBtn: { backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  changeAddressBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  addressNameRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  addressName: { fontSize: 15, fontWeight: "700", color: "#111", marginRight: 8 },
  addressPhone: { fontSize: 14, color: "#555", fontWeight: "500" },
  addressDetail: { fontSize: 14, color: "#555", lineHeight: 20 },
  noAddressText: { fontSize: 14, color: "#EF4444", fontWeight: "500" },
  loadingText: { padding: 20, textAlign: "center", color: C.sub },
  itemRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  imageContainer: { position: "relative", marginRight: 15 },
  itemImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#F0F0F0" },
  itemQuantityBadge: { position: "absolute", top: 0, right: -4, backgroundColor: COLORS.grayBadge, width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFF" },
  itemQuantityText: { fontSize: 10, fontWeight: "bold", color: "#000" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: "#555" },
  itemMetaText: { fontSize: 12, color: C.sub, marginTop: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 15, color: COLORS.textSecondary },
  summaryValue: { fontSize: 15, fontWeight: "600", color: COLORS.secondary },
  sectionTitleText: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  voucherSelectRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F0F4FF", borderWidth: 1, borderColor: "#C7D2FE", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginVertical: 4 },
  voucherIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", boxShadow: "0 2px 3px rgba(0, 0, 0, 0.05)", elevation: 2 },
  voucherSelectTitle: { fontSize: 16, fontWeight: "700", color: COLORS.secondary },
  voucherSelectSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, fontWeight: "500" },
  codPaymentCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#3B82F6", paddingVertical: 18, paddingHorizontal: 16, borderRadius: 16, marginBottom: 20 },
  codIconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 16, borderWidth: 1, borderColor: "#DBEAFE" },
  codTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  codSubtitle: { fontSize: 13, color: "#64748B", lineHeight: 18 },
  codCheckMark: { marginLeft: 8 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  totalContainer: { flexDirection: "row", alignItems: "baseline" },
  totalLabel: { fontSize: 20, fontWeight: "800", color: COLORS.secondary },
  totalValue: { fontSize: 24, fontWeight: "800", color: COLORS.secondary },
  payButton: { backgroundColor: COLORS.secondary, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 14 },
  payButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  badgeCountGray: { backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeCountTextGray: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  bottomSheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.7, backgroundColor: "#FFF", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 24 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 24 },
  sheetTitle: { fontSize: 26, fontWeight: "bold", color: "#000" },
  voucherList: { paddingHorizontal: 24 },
  voucherCard: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12, backgroundColor: COLORS.voucherBg, marginBottom: 15, position: "relative", overflow: "hidden" },
  voucherHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, zIndex: 2 },
  voucherLabel: { fontSize: 18, fontWeight: "bold", color: COLORS.primary },
  expiryBadge: { backgroundColor: COLORS.expiryBadge, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  expiryLabel: { fontSize: 12, color: "#000", fontWeight: "500" },
  dashedLine: { height: 1, borderWidth: 1, borderColor: "#CCC", borderStyle: "dashed", marginHorizontal: 12, zIndex: 2 },
  cutout: { position: "absolute", top: 50, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFF", borderWidth: 1, borderColor: COLORS.primary, zIndex: 10 },
  cutoutLeft: { left: -9 },
  cutoutRight: { right: -9 },
  voucherContent: { padding: 16 },
  voucherInfoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  voucherTitle: { fontSize: 16, fontWeight: "bold", color: "#000" },
  voucherDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 },
  applyBtn: { backgroundColor: COLORS.primary, alignSelf: "flex-end", paddingHorizontal: 24, paddingVertical: 8, borderRadius: 8 },
  applyText: { color: "#FFF", fontWeight: "bold" },
  sheetFooter: { backgroundColor: "#F0F4FF", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 34, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  statusModalContent: { width: "100%", backgroundColor: "#FFF", borderRadius: 35, padding: 30, alignItems: "center", boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)", elevation: 10 },
  statusIconContainer: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 24 },
  loadingCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  statusTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.secondary, textAlign: "center", marginBottom: 12 },
  statusDesc: { fontSize: 16, color: COLORS.textSecondary, textAlign: "center", marginBottom: 30, lineHeight: 24 },
  trackOrderBtn: { width: "100%", backgroundColor: "#F3F4F6", paddingVertical: 18, borderRadius: 16, alignItems: "center" },
  trackOrderText: { fontSize: 16, fontWeight: "700", color: COLORS.secondary },
  errorActions: { width: "100%", flexDirection: "row", gap: 12 },
  tryAgainBtn: { flex: 1, backgroundColor: COLORS.secondary, paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  tryAgainText: { color: "#FFF", fontWeight: "700" },
  changeMethodBtn: { flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  changeMethodText: { color: COLORS.secondary, fontWeight: "700" },
});

const webStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  layout: { flex: 1, flexDirection: "row", maxWidth: 1200, alignSelf: "center", width: "100%", position: "relative" },
  leftCol: { flex: 7 },
  leftScrollContent: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 120 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  backBtnHeader: { paddingRight: 4 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: COLORS.secondary, flex: 1 },
  addressCard: { backgroundColor: "#FAFBFB", padding: 18, borderRadius: 16, marginBottom: 24 },
  addressCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addressCardTitle: { fontSize: 18, fontWeight: "700", color: COLORS.secondary },
  changeAddressBtn: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  receiverName: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 4 },
  addressText: { fontSize: 14, color: "#555", lineHeight: 20 },
  noAddress: { fontSize: 14, color: "#EF4444" },
  sectionBlock: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.secondary, marginBottom: 12 },
  codCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FAFBFB", padding: 16, borderRadius: 12, gap: 12 },
  codIconWrapper: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E6EFFF", alignItems: "center", justifyContent: "center" },
  codTitle: { fontSize: 15, fontWeight: "700", color: COLORS.secondary, marginBottom: 4 },
  codSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  stickySummary: { padding: 24, backgroundColor: "#fff", position: "sticky", top: 0 },
  summaryTitle: { fontSize: 18, fontWeight: "800", color: COLORS.secondary, marginBottom: 16 },
  summaryItem: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  summaryItemImgWrap: { position: "relative", flexShrink: 0 },
  summaryItemImg: { width: 52, height: 52, borderRadius: 8, backgroundColor: "#F0F0F0" },
  summaryItemQtyBadge: { position: "absolute", top: -6, right: -6, backgroundColor: COLORS.grayBadge, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#fff" },
  summaryItemQty: { fontSize: 10, fontWeight: "700", color: "#000" },
  summaryItemName: { fontSize: 13, fontWeight: "600", color: COLORS.secondary, marginBottom: 2 },
  summaryItemMeta: { fontSize: 12, color: COLORS.textSecondary },
  summaryDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: COLORS.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: "600", color: COLORS.secondary },
  totalLabel: { fontSize: 16, fontWeight: "800", color: COLORS.secondary },
  totalValue: { fontSize: 18, fontWeight: "800", color: "#EF4444" },
  voucherRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, marginTop: 8, marginBottom: 16 },
  voucherText: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.primary },
  payButton: { backgroundColor: COLORS.secondary, paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  payButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  rightCol: { flex: 3, borderLeftWidth: 1, borderLeftColor: "#E5E7EB" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  addressSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, paddingBottom: 32, paddingHorizontal: 20, maxHeight: "75%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingHorizontal: 4 },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 4 },
  addAddressLink: { fontSize: 14, fontWeight: "700", color: "#2563EB" },
  closeBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 100 },
  addressItem: { flexDirection: "row", alignItems: "center", padding: 16, borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 16, backgroundColor: "#FFF", marginBottom: 12 },
  addressItemSelected: { borderColor: "#2563EB", backgroundColor: "rgba(239,246,255,0.25)" },
  addressNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 4 },
  addressName: { fontSize: 15, fontWeight: "700", color: "#111827", marginRight: 8 },
  addressPhone: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  defaultBadge: { backgroundColor: "#EF4444", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  defaultBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFF" },
  addressDetail: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  addressActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: "#2563EB" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2563EB" },
});
