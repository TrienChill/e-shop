import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Plus, Edit2, Trash2, Check, Upload, X, ChevronDown, CheckCircle2, Clock } from "lucide-react-native";
import { supabase } from "@/src/lib/supabase";
import {
  Banner,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "@/src/services/banner";

export default function AdminBannersScreen() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [displayOrder, setDisplayOrder] = useState("1");
  const [actionType, setActionType] = useState<"none" | "product" | "category" | "external_url">("none");
  const [actionValue, setActionValue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Image Upload State
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dropdown Data
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    fetchBanners();
    fetchDropdownData();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const data = await getAllBanners();
      setBanners(data);
    } catch (err: any) {
      alert("Lỗi tải banners: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const { data: pData } = await supabase.from("products").select("id, name");
      if (pData) setProducts(pData);
      
      const { data: cData } = await supabase.from("categories").select("id, name");
      if (cData) setCategories(cData);
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setDisplayOrder("1");
    setActionType("none");
    setActionValue("");
    setIsActive(true);
    setStartDate("");
    setEndDate("");
    setImageUrl("");
    setEditingBanner(null);
  };

  const handleOpenModal = (banner?: Banner) => {
    resetForm();
    if (banner) {
      setEditingBanner(banner);
      setTitle(banner.title || "");
      setSubtitle(banner.subtitle || "");
      setDisplayOrder(banner.display_order.toString());
      setActionType(banner.action_type || "none");
      setActionValue(banner.action_value || "");
      setIsActive(banner.is_active);
      setStartDate(banner.start_date ? new Date(banner.start_date).toISOString().split("T")[0] : "");
      setEndDate(banner.end_date ? new Date(banner.end_date).toISOString().split("T")[0] : "");
      setImageUrl(banner.image_url || "");
    } else {
      // Default order = max + 1
      const maxOrder = banners.reduce((max, b) => Math.max(max, b.display_order), 0);
      setDisplayOrder((maxOrder + 1).toString());
    }
    setModalVisible(true);
  };

  const handleUploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh hợp lệ.");
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `banners/banner_${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("images")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data } = supabase.storage.from("images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (err: any) {
      alert("Lỗi upload ảnh: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!imageUrl) {
      alert("Vui lòng tải lên ảnh Banner!");
      return;
    }
    if (isNaN(parseInt(displayOrder))) {
      alert("Thứ tự hiển thị phải là một số.");
      return;
    }

    const payload: Partial<Banner> = {
      title,
      subtitle,
      display_order: parseInt(displayOrder, 10),
      action_type: actionType,
      action_value: actionValue,
      is_active: isActive,
      image_url: imageUrl,
      start_date: startDate ? new Date(startDate).toISOString() : undefined,
      end_date: endDate ? new Date(endDate).toISOString() : undefined,
    };

    setLoading(true);
    try {
      if (editingBanner) {
        await updateBanner(editingBanner.id, payload, editingBanner.image_url);
      } else {
        await createBanner(payload);
      }
      setModalVisible(false);
      fetchBanners();
    } catch (err: any) {
      alert("Lỗi lưu banner: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (banner: Banner) => {
    const confirm = Platform.OS === "web" 
      ? window.confirm(`Bạn có chắc muốn xóa banner "${banner.title}"?`) 
      : true;
    if (!confirm) return;

    setLoading(true);
    try {
      await deleteBanner(banner.id, banner.image_url);
      fetchBanners();
    } catch (err: any) {
      alert("Lỗi xóa banner: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (banner: Banner) => {
    const now = new Date().getTime();
    if (!banner.is_active) {
      return <View style={[styles.badge, styles.badgeGray]}><Text style={styles.badgeTextGray}>Đã Tắt</Text></View>;
    }
    const started = !banner.start_date || new Date(banner.start_date).getTime() <= now;
    const ended = banner.end_date && new Date(banner.end_date).getTime() < now;

    if (!started) return <View style={[styles.badge, styles.badgeYellow]}><Text style={styles.badgeTextYellow}>Chờ chạy</Text></View>;
    if (ended) return <View style={[styles.badge, styles.badgeRed]}><Text style={styles.badgeTextRed}>Hết hạn</Text></View>;

    return <View style={[styles.badge, styles.badgeGreen]}><Text style={styles.badgeTextGreen}>Đang chạy</Text></View>;
  };

  const getActionLabel = (type: string, value: string) => {
    if (type === "none") return "Không có hành động";
    if (type === "product") return `Mở Sản phẩm (ID: ${value})`;
    if (type === "category") return `Mở Danh mục (ID: ${value})`;
    if (type === "external_url") return `Mở Link (${value})`;
    return value;
  };

  const getProductName = (idStr: string) => {
    const p = products.find(prod => prod.id.toString() === idStr);
    return p ? p.name : "Chọn sản phẩm...";
  };

  const getCategoryName = (idStr: string) => {
    const c = categories.find(cat => cat.id.toString() === idStr);
    return c ? c.name : "Chọn danh mục...";
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Quản lý Slider (Banners)</Text>
          <Text style={styles.pageSubtitle}>Thiết lập các banner quảng cáo trên trang chủ</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => handleOpenModal()}>
          <Plus size={20} color="white" />
          <Text style={styles.addBtnText}>Thêm Banner</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.listContainer}>
          {banners.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có banner nào.</Text>
          ) : (
            <View style={styles.grid}>
              {banners.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardImageContainer}>
                    <Image source={{ uri: item.image_url }} style={styles.cardImage} />
                    <View style={styles.statusOverlay}>
                      {getStatusBadge(item)}
                    </View>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title || "(Không có tiêu đề)"}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle || "(Không có chú thích)"}</Text>
                    <View style={styles.cardMeta}>
                      <Text style={styles.metaText}>Thứ tự: {item.display_order}</Text>
                      <Text style={styles.metaText} numberOfLines={1}>🔗 {getActionLabel(item.action_type, item.action_value || "")}</Text>
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable style={styles.iconBtnEdit} onPress={() => handleOpenModal(item)}>
                        <Edit2 size={16} color="#2563EB" />
                      </Pressable>
                      <Pressable style={styles.iconBtnDelete} onPress={() => handleDelete(item)}>
                        <Trash2 size={16} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingBanner ? "Chỉnh sửa Banner" : "Thêm Banner mới"}</Text>
              <Pressable onPress={() => setModalVisible(false)}><X size={24} color="#6B7280" /></Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* IMAGE UPLOAD */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ảnh Banner *</Text>
                {Platform.OS === "web" ? (
                  // @ts-ignore
                  <div
                    onClick={() => !uploadingImage && fileInputRef.current?.click()}
                    style={{
                      border: "2px dashed #D1D5DB",
                      backgroundColor: "#F9FAFB",
                      borderRadius: 12,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 20,
                      cursor: "pointer",
                      minHeight: 150,
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator color="#2563EB" />
                    ) : imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%", position: "absolute", resizeMode: "cover" }} />
                    ) : (
                      <>
                        <Upload size={32} color="#9CA3AF" />
                        <span style={{ marginTop: 8, color: "#6B7280", fontWeight: '600' }}>Click để tải ảnh lên (Tỉ lệ 2.5:1)</span>
                      </>
                    )}
                    {/* @ts-ignore */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e: any) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                ) : (
                  <Text style={{ color: "red" }}>Upload file chỉ hỗ trợ trên nền Web.</Text>
                )}
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Tiêu đề (Title)</Text>
                  <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Nhập tiêu đề chính..." />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Chú thích (Subtitle)</Text>
                  <TextInput style={styles.input} value={subtitle} onChangeText={setSubtitle} placeholder="Nhập phụ đề nhỏ..." />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Thứ tự hiển thị *</Text>
                  <TextInput style={styles.input} value={displayOrder} onChangeText={setDisplayOrder} keyboardType="numeric" />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Trạng thái</Text>
                  <Pressable 
                    style={[styles.statusToggleBtn, isActive ? styles.statusToggleActive : styles.statusToggleInactive]} 
                    onPress={() => setIsActive(!isActive)}
                  >
                    <Text style={isActive ? styles.statusToggleTextActive : styles.statusToggleTextInactive}>
                      {isActive ? "🟢 Kích hoạt" : "⚫ Tạm tắt"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Text style={[styles.label, { marginTop: 10, marginBottom: 8 }]}>Hành động khi nhấn vào Banner</Text>
              <View style={styles.actionTypeSegment}>
                <Pressable style={[styles.segmentBtn, actionType === "none" && styles.segmentActive]} onPress={() => setActionType("none")}>
                  <Text style={[styles.segmentText, actionType === "none" && styles.segmentTextActive]}>Không</Text>
                </Pressable>
                <Pressable style={[styles.segmentBtn, actionType === "product" && styles.segmentActive]} onPress={() => setActionType("product")}>
                  <Text style={[styles.segmentText, actionType === "product" && styles.segmentTextActive]}>Sản phẩm</Text>
                </Pressable>
                <Pressable style={[styles.segmentBtn, actionType === "category" && styles.segmentActive]} onPress={() => setActionType("category")}>
                  <Text style={[styles.segmentText, actionType === "category" && styles.segmentTextActive]}>Danh mục</Text>
                </Pressable>
                <Pressable style={[styles.segmentBtn, actionType === "external_url" && styles.segmentActive]} onPress={() => setActionType("external_url")}>
                  <Text style={[styles.segmentText, actionType === "external_url" && styles.segmentTextActive]}>URL Web</Text>
                </Pressable>
              </View>

              {/* DYNAMIC ACTION INPUT */}
              {actionType !== "none" && (
                <View style={[styles.inputGroup, { marginTop: 12, backgroundColor: "#F9FAFB", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" }]}>
                  {actionType === "external_url" && (
                    <>
                      <Text style={styles.label}>Link Website (URL)</Text>
                      <TextInput style={styles.input} value={actionValue} onChangeText={setActionValue} placeholder="https://..." />
                    </>
                  )}
                  
                  {actionType === "product" && (
                     <View style={{zIndex: 50}}>
                       <Text style={styles.label}>Chọn Sản phẩm</Text>
                       <Pressable style={styles.dropdownSelector} onPress={() => setShowProductDropdown(!showProductDropdown)}>
                         <Text style={{ color: actionValue ? "#111827" : "#9CA3AF" }}>{getProductName(actionValue)}</Text>
                         <ChevronDown size={16} color="#6B7280" />
                       </Pressable>
                       {showProductDropdown && (
                         <View style={styles.dropdownList}>
                           <ScrollView nestedScrollEnabled style={{maxHeight: 150}}>
                             {products.map(p => (
                               <Pressable key={p.id} style={styles.dropdownItem} onPress={() => { setActionValue(p.id.toString()); setShowProductDropdown(false); }}>
                                 <Text style={styles.dropdownItemText}>{p.name}</Text>
                               </Pressable>
                             ))}
                           </ScrollView>
                         </View>
                       )}
                     </View>
                  )}

                  {actionType === "category" && (
                     <View style={{zIndex: 40}}>
                       <Text style={styles.label}>Chọn Danh mục</Text>
                       <Pressable style={styles.dropdownSelector} onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}>
                         <Text style={{ color: actionValue ? "#111827" : "#9CA3AF" }}>{getCategoryName(actionValue)}</Text>
                         <ChevronDown size={16} color="#6B7280" />
                       </Pressable>
                       {showCategoryDropdown && (
                         <View style={styles.dropdownList}>
                           <ScrollView nestedScrollEnabled style={{maxHeight: 150}}>
                             {categories.map(c => (
                               <Pressable key={c.id} style={styles.dropdownItem} onPress={() => { setActionValue(c.id.toString()); setShowCategoryDropdown(false); }}>
                                 <Text style={styles.dropdownItemText}>{c.name}</Text>
                               </Pressable>
                             ))}
                           </ScrollView>
                         </View>
                       )}
                     </View>
                  )}
                </View>
              )}

              <Text style={[styles.label, { marginTop: 12 }]}>Lên Lịch (Tùy chọn)</Text>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Ngày bắt đầu (Y-M-D)</Text>
                  <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="Tuỳ chọn" />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Ngày kết thúc (Y-M-D)</Text>
                  <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="Tuỳ chọn" />
                </View>
              </View>

            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnCancelText}>Hủy</Text>
              </Pressable>
              <Pressable style={styles.btnSave} onPress={handleSave}>
                {uploadingImage || loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnSaveText}>Lưu Banner</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6", padding: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  pageSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#2563EB", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: "white", fontWeight: "600", fontSize: 14 },
  listContainer: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -8 },
  card: { width: "33.33%", padding: 8 },
  cardImageContainer: { height: 140, borderRadius: 12, backgroundColor: "#E5E7EB", overflow: "hidden", position: "relative" },
  cardImage: { width: "100%", height: "100%", resizeMode: "cover" },
  statusOverlay: { position: "absolute", top: 10, right: 10 },
  cardContent: { padding: 12, backgroundColor: "white", borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", borderTopWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  cardMeta: { gap: 4, marginBottom: 16 },
  metaText: { fontSize: 12, color: "#4B5563" },
  cardActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  iconBtnEdit: { padding: 8, backgroundColor: "#DBEAFE", borderRadius: 8 },
  iconBtnDelete: { padding: 8, backgroundColor: "#FEE2E2", borderRadius: 8 },
  emptyText: { textAlign: "center", marginTop: 50, color: "#9CA3AF" },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeGreen: { backgroundColor: "#DCFCE7" },
  badgeTextGreen: { color: "#166534", fontSize: 11, fontWeight: "700" },
  badgeRed: { backgroundColor: "#FEE2E2" },
  badgeTextRed: { color: "#991B1B", fontSize: 11, fontWeight: "700" },
  badgeYellow: { backgroundColor: "#FEF9C3" },
  badgeTextYellow: { color: "#854D0E", fontSize: 11, fontWeight: "700" },
  badgeGray: { backgroundColor: "#F3F4F6" },
  badgeTextGray: { color: "#4B5563", fontSize: 11, fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: 600, maxHeight: "90%", backgroundColor: "white", borderRadius: 16, overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderColor: "#E5E7EB" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalScroll: { padding: 20, gap: 16 },
  row: { flexDirection: "row", gap: 16 },
  inputGroup: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: "white" },
  statusToggleBtn: { flex: 1, justifyContent: "center", alignItems: "center", borderRadius: 8, borderWidth: 1, height: 46 },
  statusToggleActive: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  statusToggleInactive: { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" },
  statusToggleTextActive: { color: "#166534", fontWeight: "600" },
  statusToggleTextInactive: { color: "#6B7280", fontWeight: "600" },
  
  actionTypeSegment: { flexDirection: "row", borderRadius: 8, borderWidth: 1, borderColor: "#D1D5DB", overflow: "hidden" },
  segmentBtn: { flex: 1, paddingVertical: 10, alignItems: "center", backgroundColor: "#F9FAFB", borderRightWidth: 1, borderColor: "#D1D5DB" },
  segmentActive: { backgroundColor: "#2563EB" },
  segmentText: { fontSize: 12, fontWeight: "600", color: "#4B5563" },
  segmentTextActive: { color: "white" },

  dropdownSelector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, backgroundColor: "white" },
  dropdownList: { position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "white", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, marginTop: 4, zIndex: 100, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownItemText: { fontSize: 14, color: "#374151" },

  modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 12, padding: 16, borderTopWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB" },
  btnCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: "white", borderWidth: 1, borderColor: "#D1D5DB" },
  btnCancelText: { fontWeight: "600", color: "#4B5563" },
  btnSave: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: "#2563EB", minWidth: 120, alignItems: "center" },
  btnSaveText: { fontWeight: "600", color: "white" },
});
