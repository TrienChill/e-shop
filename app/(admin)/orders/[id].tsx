import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase, supabaseAdmin } from "@/src/lib/supabase";
import {
  ChevronLeft,
  Package,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  AlertTriangle,
  ShoppingCart,
  FileText,
  Trash2,
  Pencil,
  Lock,
  Save,
  X,
  ChevronDown,
} from "lucide-react-native";
import { TextInput, Alert } from "react-native";
import { encodeOrderId } from "@/src/utils/orderId";
import { AdminDataWrapper } from "@/src/components/admin/AdminDataWrapper";
import { fetchProvinces, fetchDistricts, fetchWards, calculateShippingFee } from "@/src/services/ghn/shippingService";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  processing: "Đang chuẩn bị",
  shipping: "Đang giao",
  delivery_failed: "Giao thất bại",
  completed: "Thành công",
  cancelled: "Đã hủy",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  processing: "#2563EB",
  shipping: "#8B5CF6",
  delivery_failed: "#F97316",
  completed: "#10B981",
  cancelled: "#EF4444",
};

const STATUS_BG: Record<string, string> = {
  pending: "#FEF3C7",
  processing: "#DBEAFE",
  shipping: "#EDE9FE",
  delivery_failed: "#FFEDD5",
  completed: "#D1FAE5",
  cancelled: "#FEE2E2",
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const formatMoney = (amount: number | null) => {
  if (amount == null) return "—";
  return amount.toLocaleString("vi-VN") + "₫";
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ receiver_name: "", phone_contact: "", shipping_address: "" });
  const [editShippingFee, setEditShippingFee] = useState<number | null>(null);

  // GHN Address State
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  
  const [selectedProvince, setSelectedProvince] = useState<any>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [selectedWard, setSelectedWard] = useState<any>(null);
  const [streetAddress, setStreetAddress] = useState("");

  const [activeDropdown, setActiveDropdown] = useState<'province'|'district'|'ward'|null>(null);

  useEffect(() => {
    fetchProvinces().then(data => setProvinces(data));
  }, []);

  useEffect(() => {
    if (selectedProvince) {
      fetchDistricts(selectedProvince.ProvinceID).then(data => {
        setDistricts(data);
        setSelectedDistrict(null);
        setSelectedWard(null);
        setWards([]);
      });
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedDistrict) {
      fetchWards(selectedDistrict.DistrictID).then(data => {
        setWards(data);
        setSelectedWard(null);
      });
    }
  }, [selectedDistrict]);

  useEffect(() => {
    const fetchFee = async () => {
      if (selectedDistrict && selectedWard && order) {
        const items: any[] = order.order_items ?? [];
        const totalWeight = items.length > 0 ? items.reduce((sum, item) => sum + (500 * item.quantity), 0) : 500;
        const subtotalValue = items.length > 0 ? items.reduce((sum, item) => sum + ((item.price_at_purchase ?? 0) * item.quantity), 0) : 0;

        try {
          const fee = await calculateShippingFee(
            { code: 'ghn', price: 30000 } as any,
            {
              to_district_id: selectedDistrict.DistrictID,
              to_ward_code: selectedWard.WardCode,
              weight: totalWeight,
              insurance_value: subtotalValue
            }
          );
          setEditShippingFee(fee);
        } catch (error) {
          console.error("Lỗi tính phí GHN:", error);
          setEditShippingFee(30000);
        }
      } else {
        setEditShippingFee(null);
      }
    };

    if (isEditing) {
      fetchFee();
    }
  }, [selectedDistrict, selectedWard, isEditing, order]);

  // Editable only when pending and no GHN code yet
  const isLocked = order && (order.status !== "pending" || !!order.ghn_order_code);
  const isPending = order?.status === "pending";

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items (
            id,
            quantity,
            price_at_purchase,
            selected_variant,
            product_id,
            products (
              id,
              name,
              images
            )
          )
        `
        )
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error("Không tìm thấy đơn hàng.");
      setOrder(data);
    } catch (err: any) {
      setError(err.message ?? "Lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = typeof window !== "undefined"
      ? window.confirm("Bạn có chắc muốn XOÁ đơn hàng này không? Hành động này không thể hoàn tác.")
      : false;
    if (!confirmed) return;
    setIsDeleting(true);
    const client = supabaseAdmin ?? supabase; // bypass RLS
    try {
      console.log("[DELETE] Bắt đầu xoá order_id:", id);

      const { error: itemsErr } = await client
        .from("order_items")
        .delete()
        .eq("order_id", id);
      console.log("[DELETE] order_items error:", itemsErr);
      if (itemsErr) throw new Error("Lỗi xoá order_items: " + JSON.stringify(itemsErr));

      const { error: delErr } = await client
        .from("orders")
        .delete()
        .eq("id", id);
      console.log("[DELETE] orders error:", delErr);
      if (delErr) throw new Error("Lỗi xoá orders: " + JSON.stringify(delErr));

      console.log("[DELETE] Xoá thành công, chuyển trang...");
      router.push("/(admin)/orders");
    } catch (err: any) {
      console.error("[DELETE] Error:", err);
      alert("Lỗi khi xoá đơn hàng:\n" + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEdit = () => {
    setEditForm({
      receiver_name: order.receiver_name ?? "",
      phone_contact: order.phone_contact ?? "",
      shipping_address: order.shipping_address ?? "",
    });
    setStreetAddress("");
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setEditShippingFee(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editForm.receiver_name.trim() || !editForm.phone_contact.trim()) {
      alert("Vui lòng điền đầy đủ Tên người nhận và Số điện thoại.");
      return;
    }
    
    let finalAddress = editForm.shipping_address;
    let finalFee = order.shipping_fee;

    // If user filled out new GHN address
    if (selectedWard && selectedDistrict && selectedProvince) {
      if (!streetAddress.trim()) {
        alert("Vui lòng điền Số nhà, tên đường.");
        return;
      }
      finalAddress = `${streetAddress.trim()}, ${selectedWard.WardName}, ${selectedDistrict.DistrictName}, ${selectedProvince.ProvinceName}`;
      finalFee = editShippingFee ?? 30000;
    }

    setIsSaving(true);
    try {
      const { error: saveErr } = await supabase
        .from("orders")
        .update({
          receiver_name: editForm.receiver_name,
          phone_contact: editForm.phone_contact,
          shipping_address: finalAddress,
          shipping_fee: finalFee,
        })
        .eq("id", id);
      if (saveErr) throw saveErr;
      await fetchOrderDetail();
      setIsEditing(false);
    } catch (err: any) {
      alert("Lỗi khi lưu: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.centered}>
        <AlertTriangle size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Không tìm thấy đơn hàng</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.backButton} onPress={() => router.push("/(admin)/orders")}>
          <ChevronLeft size={18} color="white" />
          <Text style={styles.backButtonText}>Quay lại danh sách</Text>
        </Pressable>
      </View>
    );
  }

  const items: any[] = order.order_items ?? [];
  const subtotal = items.reduce(
    (sum: number, item: any) => sum + (item.price_at_purchase ?? 0) * item.quantity,
    0
  );
  const shippingFee = isEditing && editShippingFee !== null ? editShippingFee : (order.shipping_fee ?? 0);
  const discount = order.discount_amount ?? 0;
  const total = order.total_amount ?? subtotal + shippingFee - discount;
  const statusColor = STATUS_COLORS[order.status] ?? "#6B7280";
  const statusBg = STATUS_BG[order.status] ?? "#F3F4F6";

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.push("/(admin)/orders")}>
          <ChevronLeft size={22} color="#374151" />
          <Text style={styles.backBtnText}>Quay lại</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.orderTitle}>Đơn hàng {encodeOrderId(order.id)}</Text>
          <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.headerActions}>
          {isPending && !isLocked && (
            isEditing ? (
              <>
                <Pressable style={styles.btnSave} onPress={handleSave} disabled={isSaving}>
                  <Save size={16} color="white" />
                  <Text style={styles.btnText}>{isSaving ? "Đang lưu..." : "Lưu"}</Text>
                </Pressable>
                <Pressable style={styles.btnCancel} onPress={() => setIsEditing(false)}>
                  <X size={16} color="#374151" />
                  <Text style={[styles.btnText, { color: "#374151" }]}>Huỷ</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.btnEdit} onPress={handleStartEdit}>
                <Pencil size={16} color="white" />
                <Text style={styles.btnText}>Chỉnh sửa</Text>
              </Pressable>
            )
          )}
          <Pressable style={styles.btnDelete} onPress={handleDelete} disabled={isDeleting}>
            <Trash2 size={16} color="white" />
            <Text style={styles.btnText}>{isDeleting ? "Đang xoá..." : "Xoá đơn"}</Text>
          </Pressable>
        </View>
      </View>

      {/* Locked banner */}
      {isLocked && order && (
        <View style={styles.lockedBanner}>
          <Lock size={16} color="#92400E" />
          <Text style={styles.lockedText}>
            {order.ghn_order_code
              ? `Đơn đã được đẩy lên GHN (Mã: ${order.ghn_order_code}) — không thể chỉnh sửa.`
              : "Đơn hàng đang trong quá trình xử lý — không thể chỉnh sửa."}
          </Text>
        </View>
      )}

      {/* CONTENT */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.layout}>

          {/* LEFT COLUMN */}
          <View style={styles.leftColumn}>

            {/* Card: Thông tin khách hàng */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Package size={20} color="#2563EB" />
                <Text style={styles.cardTitle}>Thông tin khách hàng & Giao hàng</Text>
              </View>

              {isEditing ? (
                <View style={{ zIndex: 10 }}>
                  <EditField label="Người nhận *" value={editForm.receiver_name} onChangeText={v => setEditForm(f => ({ ...f, receiver_name: v }))} />
                  <EditField label="Số điện thoại *" value={editForm.phone_contact} onChangeText={v => setEditForm(f => ({ ...f, phone_contact: v }))} keyboardType="phone-pad" />
                  
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>
                      Cập nhật địa chỉ giao hàng (Tùy chọn)
                    </Text>
                    <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
                      Địa chỉ hiện tại: <Text style={{ fontWeight: "600" }}>{order.shipping_address}</Text>
                    </Text>

                    <View style={{ gap: 12 }}>
                      <View style={{ zIndex: 3000 }}>
                        <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "500", marginBottom: 4 }}>Tỉnh/Thành phố</Text>
                        <View style={{ position: 'relative' }}>
                          <Pressable 
                            style={[styles.dropdownSelector]}
                            onPress={() => setActiveDropdown(activeDropdown === 'province' ? null : 'province')}
                          >
                            <Text style={selectedProvince ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
                              {selectedProvince ? selectedProvince.ProvinceName : "Chọn Tỉnh/Thành"}
                            </Text>
                            <ChevronDown size={16} color="#6B7280" />
                          </Pressable>
                          {activeDropdown === 'province' && (
                            <View style={styles.dropdownMenu}>
                              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                                {provinces.map(prov => (
                                  <Pressable 
                                    key={prov.ProvinceID}
                                    style={styles.dropdownMenuItem}
                                    onPress={() => {
                                      setSelectedProvince(prov);
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    <Text style={styles.dropdownMenuItemText}>{prov.ProvinceName}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={{ zIndex: 2000 }}>
                        <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "500", marginBottom: 4 }}>Quận/Huyện</Text>
                        <View style={{ position: 'relative' }}>
                          <Pressable 
                            style={[styles.dropdownSelector, !selectedProvince && styles.dropdownDisabled]}
                            onPress={() => selectedProvince && setActiveDropdown(activeDropdown === 'district' ? null : 'district')}
                          >
                            <Text style={selectedDistrict ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
                              {selectedDistrict ? selectedDistrict.DistrictName : "Chọn Quận/Huyện"}
                            </Text>
                            <ChevronDown size={16} color="#6B7280" />
                          </Pressable>
                          {activeDropdown === 'district' && (
                            <View style={styles.dropdownMenu}>
                              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                                {districts.map(dist => (
                                  <Pressable 
                                    key={dist.DistrictID}
                                    style={styles.dropdownMenuItem}
                                    onPress={() => {
                                      setSelectedDistrict(dist);
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    <Text style={styles.dropdownMenuItemText}>{dist.DistrictName}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={{ zIndex: 1000 }}>
                        <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "500", marginBottom: 4 }}>Phường/Xã</Text>
                        <View style={{ position: 'relative' }}>
                          <Pressable 
                            style={[styles.dropdownSelector, !selectedDistrict && styles.dropdownDisabled]}
                            onPress={() => selectedDistrict && setActiveDropdown(activeDropdown === 'ward' ? null : 'ward')}
                          >
                            <Text style={selectedWard ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
                              {selectedWard ? selectedWard.WardName : "Chọn Phường/Xã"}
                            </Text>
                            <ChevronDown size={16} color="#6B7280" />
                          </Pressable>
                          {activeDropdown === 'ward' && (
                            <View style={styles.dropdownMenu}>
                              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                                {wards.map(ward => (
                                  <Pressable 
                                    key={ward.WardCode}
                                    style={styles.dropdownMenuItem}
                                    onPress={() => {
                                      setSelectedWard(ward);
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    <Text style={styles.dropdownMenuItemText}>{ward.WardName}</Text>
                                  </Pressable>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      </View>

                      <EditField 
                        label="Số nhà, Đường" 
                        value={streetAddress} 
                        onChangeText={setStreetAddress} 
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <InfoRow icon={<Package size={16} color="#6B7280" />} label="Người nhận" value={order.receiver_name ?? "—"} />
                  <InfoRow icon={<Phone size={16} color="#6B7280" />} label="Số điện thoại" value={order.phone_contact ?? "—"} />
                  <InfoRow icon={<MapPin size={16} color="#6B7280" />} label="Địa chỉ giao hàng" value={order.shipping_address ?? "—"} />
                </>
              )}
              <InfoRow
                icon={<CreditCard size={16} color="#6B7280" />}
                label="Phương thức TT"
                value={order.payment_method === "COD" ? "Thanh toán khi nhận hàng (COD)" : order.payment_method === "VNPay" ? "Thanh toán qua VNPay" : order.payment_method ?? "—"}
              />
              {order.payment_method === "VNPay" && (
                <>
                  <InfoRow
                    icon={<FileText size={16} color="#6B7280" />}
                    label="Trạng thái TT"
                    value={
                      order.payment_status === "paid" ? "Đã thanh toán" 
                      : order.payment_status === "failed" ? "Thất bại" 
                      : order.payment_status === "refunded" ? "Đã hoàn tiền"
                      : "Chưa thanh toán"
                    }
                    highlight={order.payment_status === "paid"}
                  />
                  {order.transaction_id && (
                    <InfoRow
                      icon={<FileText size={16} color="#6B7280" />}
                      label="Mã GD VNPay"
                      value={order.transaction_id}
                      highlight={true}
                    />
                  )}
                </>
              )}
              {order.ghn_order_code && (
                <InfoRow
                  icon={<Truck size={16} color="#6B7280" />}
                  label="Mã vận đơn GHN"
                  value={order.ghn_order_code}
                  highlight
                />
              )}
              {(order.status === "delivery_failed" || order.status === "cancelled") && order.cancel_reason && (
                <View style={styles.reasonBox}>
                  <AlertTriangle size={16} color="#F97316" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reasonLabel}>
                      {order.status === "delivery_failed" ? "Lý do giao thất bại:" : "Lý do hủy:"}
                    </Text>
                    <Text style={styles.reasonText}>{order.cancel_reason}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Card: Thanh toán summary */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <FileText size={20} color="#2563EB" />
                <Text style={styles.cardTitle}>Tóm tắt thanh toán</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tạm tính:</Text>
                <Text style={styles.summaryValue}>{formatMoney(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Phí vận chuyển:</Text>
                <Text style={styles.summaryValue}>{formatMoney(shippingFee)}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Giảm giá:</Text>
                  <Text style={[styles.summaryValue, { color: "#10B981" }]}>-{formatMoney(discount)}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalLabel}>Tổng thanh toán:</Text>
                <Text style={styles.summaryTotalValue}>{formatMoney(total)}</Text>
              </View>
            </View>
          </View>

          {/* RIGHT COLUMN: Products */}
          <View style={styles.rightColumn}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ShoppingCart size={20} color="#2563EB" />
                <Text style={styles.cardTitle}>Danh sách sản phẩm ({items.length})</Text>
              </View>

              {items.length === 0 ? (
                <Text style={styles.emptyText}>Không có sản phẩm nào trong đơn hàng này.</Text>
              ) : (
                <>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Sản phẩm</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: "center" }]}>SL</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>Đơn giá</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>Thành tiền</Text>
                  </View>

                  {items.map((item: any, index: number) => {
                    const product = item.products;
                    const imageUrl = product?.images?.[0];
                    const variant = item.selected_variant;
                    const variantText = variant
                      ? [variant.color, variant.size].filter(Boolean).join(" - ")
                      : null;
                    const lineTotal = (item.price_at_purchase ?? 0) * item.quantity;

                    return (
                      <AdminDataWrapper
                        key={item.id}
                        onPress={() => router.push(`/(admin)/products/${item.product_id}` as any)}
                        style={[styles.productRow, index % 2 === 0 && styles.productRowEven]}
                      >
                        <View style={[styles.productInfo, { flex: 3 }]}>
                          {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.productImage} />
                          ) : (
                            <View style={styles.productImagePlaceholder}>
                              <Package size={16} color="#9CA3AF" />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.productName} numberOfLines={2}>
                              {product?.name ?? "Sản phẩm không xác định"}
                            </Text>
                            {variantText && (
                              <Text style={styles.productVariant}>{variantText}</Text>
                            )}
                          </View>
                        </View>
                        <Text style={[styles.productCell, { flex: 1, textAlign: "center" }]}>
                          {item.quantity}
                        </Text>
                        <Text style={[styles.productCell, { flex: 1.5, textAlign: "right" }]}>
                          {formatMoney(item.price_at_purchase)}
                        </Text>
                        <Text style={[styles.productCell, styles.productTotal, { flex: 1.5, textAlign: "right" }]}>
                          {formatMoney(lineTotal)}
                        </Text>
                      </AdminDataWrapper>
                    );
                  })}
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={infoStyles.row}>
      <View style={infoStyles.iconWrap}>{icon}</View>
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={[infoStyles.value, highlight && infoStyles.valueHighlight]}>{value}</Text>
      </View>
    </View>
  );
}

function EditField({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "500", marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: "#D1D5DB",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 14,
          color: "#1F2937",
          backgroundColor: "#F9FAFB",
          minHeight: multiline ? 72 : undefined,
          textAlignVertical: multiline ? "top" : undefined,
        }}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  iconWrap: {
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  valueHighlight: {
    color: "#2563EB",
    fontWeight: "700",
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
    backgroundColor: "#F3F4F6",
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: 400,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  backButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 16,
    flexWrap: "wrap",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  headerCenter: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.5,
  },
  orderDate: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  btnEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnSave: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnCancel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  btnDelete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EF4444",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  lockedText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "500",
    flex: 1,
  },
  // Scroll
  scrollContent: {
    padding: 32,
  },
  layout: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 24,
    alignItems: "flex-start",
  },
  leftColumn: {
    flex: 1,
    gap: 24,
    minWidth: 0,
  },
  rightColumn: {
    flex: 1.4,
    minWidth: 0,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      web: { boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" } as any,
      default: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  reasonBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9A3412",
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 14,
    color: "#7C2D12",
  },
  // Summary
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  summaryTotalRow: {
    borderTopWidth: 2,
    borderTopColor: "#E5E7EB",
    borderBottomWidth: 0,
    paddingTop: 14,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  summaryTotalValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2563EB",
    textAlign: "right",
  },
  // Products table
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#E5E7EB",
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 8,
  },
  productRowEven: {
    backgroundColor: "#FAFAFA",
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  productImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  productVariant: {
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  productCell: {
    fontSize: 14,
    color: "#374151",
  },
  productTotal: {
    fontWeight: "700",
    color: "#059669",
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 14,
    paddingVertical: 24,
  },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.7,
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  dropdownSelectedText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    ...Platform.select({
      web: { boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' } as any,
      default: { elevation: 5 },
    }),
    zIndex: 9999,
  },
  dropdownMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownMenuItemText: {
    fontSize: 14,
    color: '#374151',
  },
});
