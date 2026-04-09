import { supabase } from "@/src/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Image as ImageIcon, Plus, Save, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// Type definitions
interface ProductImage {
  id?: string;
  url: string;
  variant_id?: string | null;
  image_type: 'general' | 'variant' | 'description';
  is_thumbnail: boolean;
  display_order: number;
  localUri?: string; // For new ones
}

export default function ProductEditorScreen() {
  const { id } = useLocalSearchParams();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Form State Cơ bản
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");

  // Image State
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);

  // Variant State
  const [variants, setVariants] = useState<any[]>([]);
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newStock, setNewStock] = useState("0");
  const [newPrice, setNewPrice] = useState(""); // Để trống sẽ dùng giá mặc định

  // Fetch dữ liệu nếu là Edit Mode
  useEffect(() => {
    if (!isNew) {
      fetchProductDetail();
    }
  }, [id]);

  const fetchProductDetail = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setName(data.name);
      setPrice(String(data.price));
      setDescription(data.description || "");
      
      // Fetch Images from product_images table
      fetchProductImages(data.id);
      
      // Fetch Variants
      fetchVariants(data.id);
    }
    setLoading(false);
  };

  const fetchProductImages = async (productId: string) => {
    const { data, error } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("display_order", { ascending: true });
    
    if (data) {
      setProductImages(data as ProductImage[]);
    }
  };

  const fetchVariants = async (productId: string) => {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId);
    if (data) setVariants(data);
  };

  // Hàm chọn ảnh
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Bạn cần cấp quyền truy cập thư viện ảnh!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      const newImages: ProductImage[] = result.assets.map(asset => ({
        localUri: asset.uri,
        url: "", // Will be filled after upload
        image_type: 'general',
        is_thumbnail: productImages.length === 0, // Default first image as thumbnail
        display_order: productImages.length,
      }));
      setProductImages([...productImages, ...newImages]);
    }
  };

  // Hàm upload ảnh lên Supabase Storage
  const uploadImageToStorage = async (uri: string): Promise<string | null> => {
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from("avatars") // Sử dụng bucket 'avatars' theo yêu cầu
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error("Lỗi upload:", error);
      alert("Không thể tải ảnh lên!");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Hàm thêm variant vào list tạm
  const addVariant = () => {
    if (!newColor && !newSize) return alert("Vui lòng nhập màu hoặc size!");
    const v = {
      color: newColor || null,
      size: newSize || null,
      stock: parseInt(newStock) || 0,
      price: newPrice ? parseFloat(newPrice) : parseFloat(price),
      id: "temp_" + Math.random().toString(36).substr(2, 9),
    };
    setVariants([...variants, v]);
    setNewColor("");
    setNewSize("");
    setNewStock("0");
    setNewPrice("");
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  // Hàm Lưu dữ liệu
  const handleSave = async () => {
    if (!name || !price) return alert("Vui lòng nhập tên và giá!");
    setSaving(true);

    try {
      const productId = isNew ? null : id;
      
      // 1. Upload các ảnh mới
      const updatedImages = await Promise.all(productImages.map(async (img) => {
        if (img.localUri && !img.url) {
          const uploadedUrl = await uploadImageToStorage(img.localUri);
          return { ...img, url: uploadedUrl || "" };
        }
        return img;
      }));

      if (updatedImages.some(img => !img.url)) {
        throw new Error("Lỗi upload một số hình ảnh. Vui lòng thử lại.");
      }

      // 2. Lưu/Cập nhật Product
      const productData = {
        name,
        price: parseFloat(price),
        description,
        is_active: true,
      };

      let finalProductId = productId;
      if (isNew) {
        const { data: newProd, error: prodErr } = await supabase.from("products").insert([productData]).select().single();
        if (prodErr) throw prodErr;
        finalProductId = newProd.id;
      } else {
        const { error: prodErr } = await supabase.from("products").update(productData).eq("id", id);
        if (prodErr) throw prodErr;
      }

      // 3. Quản lý Variants (Dùng Upsert để giữ ID)
      // Xóa các variants cũ không còn trong list
      if (!isNew) {
        const variantIdsToKeep = variants.filter(v => !v.id.startsWith("temp")).map(v => v.id);
        if (variantIdsToKeep.length > 0) {
          await supabase.from("product_variants").delete().eq("product_id", finalProductId).not("id", "in", variantIdsToKeep);
        } else {
          await supabase.from("product_variants").delete().eq("product_id", finalProductId);
        }
      }

      const variantsToUpsert = variants.map(v => ({
        id: v.id.startsWith("temp") ? undefined : v.id,
        product_id: finalProductId,
        color: v.color,
        size: v.size,
        stock: v.stock,
        price: v.price || productData.price,
      }));

      const { data: savedVariants, error: varErr } = await supabase.from("product_variants").upsert(variantsToUpsert).select();
      if (varErr) throw varErr;

      // 4. Lưu Hình ảnh vào product_images
      // Xóa ảnh cũ
      await supabase.from("product_images").delete().eq("product_id", finalProductId);

      // Chuẩn bị data insert cho images
      const imagesToInsert = updatedImages.map(img => {
        let variantId = img.variant_id;
        
        // Nếu variant_id là temp, tìm ID thật từ savedVariants
        if (variantId && variantId.startsWith("temp")) {
          const tempVariant = variants.find(v => v.id === variantId);
          const realVariant = savedVariants.find(sv => 
            sv.color === tempVariant.color && sv.size === tempVariant.size
          );
          variantId = realVariant?.id || null;
        }

        return {
          product_id: finalProductId,
          variant_id: variantId,
          url: img.url,
          is_thumbnail: img.is_thumbnail,
          image_type: img.image_type,
          display_order: img.display_order
        };
      });

      const { error: imgErr } = await supabase.from("product_images").insert(imagesToInsert);
      if (imgErr) throw imgErr;

      alert(isNew ? "Thêm sản phẩm thành công!" : "Cập nhật thành công!");
      router.push("/(admin)/products");
    } catch (err: any) {
      console.error(err);
      alert("Đã có lỗi xảy ra: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="#374151" size={20} />
          </Pressable>
          <Text style={styles.title}>{isNew ? "Thêm Sản phẩm mới" : "Sửa Sản phẩm"}</Text>
        </View>

        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Save color="white" size={20} />}
          <Text style={styles.saveBtnText}>Lưu</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Card: Thông tin cơ bản */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin cơ bản</Text>

          <Text style={styles.label}>Tên sản phẩm *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="VD: Áo thun nam" />

          <Text style={styles.label}>Giá cơ bản (VNĐ) *</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />

          <Text style={styles.label}>Mô tả</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="Nhập mô tả sản phẩm..."
          />
        </View>

        {/* Card: Quản lý Hình ảnh */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Hình ảnh sản phẩm</Text>
            <Pressable style={styles.pickBtn} onPress={pickImage} disabled={uploading || saving}>
              <Plus size={18} color="#2563EB" />
              <Text style={styles.pickBtnText}>Tải ảnh</Text>
            </Pressable>
          </View>

          <View style={styles.imageList}>
            {productImages.map((img, index) => (
              <View key={img.id || img.localUri || index} style={styles.imageItem}>
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: img.localUri || img.url }} style={styles.previewImage} />
                  {img.is_thumbnail && (
                    <View style={styles.thumbnailBadge}>
                      <Text style={styles.thumbnailBadgeText}>Ảnh bìa</Text>
                    </View>
                  )}
                  {img.localUri && !img.url && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>Mới</Text>
                    </View>
                  )}
                </View>

                <View style={styles.imageControls}>
                  <View style={styles.controlRow}>
                    <Pressable 
                      style={[styles.smallBtn, img.is_thumbnail && styles.activeBtn]} 
                      onPress={() => {
                        setProductImages(prev => prev.map((p, i) => ({
                          ...p,
                          is_thumbnail: i === index
                        })));
                      }}
                    >
                      <Text style={[styles.smallBtnText, img.is_thumbnail && styles.activeBtnText]}>Làm ảnh bìa</Text>
                    </Pressable>

                    <Pressable 
                      style={styles.removeIconBtn} 
                      onPress={() => setProductImages(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </Pressable>
                  </View>

                  <View style={styles.typeSelector}>
                    <Pressable 
                      style={[styles.typeBtn, img.image_type === 'general' && styles.activeTypeBtn]}
                      onPress={() => {
                        setProductImages(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], image_type: 'general', variant_id: null };
                          return updated;
                        });
                      }}
                    >
                      <Text style={[styles.typeBtnText, img.image_type === 'general' && styles.activeTypeBtnText]}>Chung</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.typeBtn, img.image_type === 'variant' && styles.activeTypeBtn]}
                      onPress={() => {
                        setProductImages(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], image_type: 'variant' };
                          return updated;
                        });
                      }}
                    >
                      <Text style={[styles.typeBtnText, img.image_type === 'variant' && styles.activeTypeBtnText]}>Biến bản</Text>
                    </Pressable>
                  </View>

                  {img.image_type === 'variant' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantSelector}>
                      {variants.map((v) => (
                        <Pressable 
                          key={v.id} 
                          style={[styles.variantChip, img.variant_id === v.id && styles.activeVariantChip]}
                          onPress={() => {
                            setProductImages(prev => {
                              const updated = [...prev];
                              updated[index] = { ...updated[index], variant_id: v.id };
                              return updated;
                            });
                          }}
                        >
                          <Text style={[styles.variantChipText, img.variant_id === v.id && styles.activeVariantChipText]}>
                            {v.color || ""}{v.color && v.size ? " - " : ""}{v.size || ""}
                          </Text>
                        </Pressable>
                      ))}
                      {variants.length === 0 && <Text style={styles.noVariantsPrompt}>Chưa có phân loại</Text>}
                    </ScrollView>
                  )}
                </View>
              </View>
            ))}

            {productImages.length === 0 && (
              <View style={styles.emptyImage}>
                <ImageIcon size={40} color="#9CA3AF" />
                <Text style={styles.emptyText}>Chưa có hình ảnh</Text>
              </View>
            )}
          </View>
          
          {(uploading || saving) && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.uploadingText}>Đang xử lý dữ liệu...</Text>
            </View>
          )}
        </View>

        {/* Card: Phân loại & Tồn kho */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Phân loại & Tồn kho</Text>
          
          <View style={styles.variantForm}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.inputLabel}>Màu</Text>
              <TextInput style={styles.smallInput} value={newColor} onChangeText={setNewColor} placeholder="Đỏ..." />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.inputLabel}>Size</Text>
              <TextInput style={styles.smallInput} value={newSize} onChangeText={setNewSize} placeholder="M, L..." />
            </View>
            <View style={{ width: 60, gap: 8 }}>
              <Text style={styles.inputLabel}>Kho</Text>
              <TextInput style={styles.smallInput} value={newStock} onChangeText={setNewStock} keyboardType="numeric" />
            </View>
            <Pressable style={styles.addVariantBtn} onPress={addVariant}>
              <Plus size={20} color="white" />
            </Pressable>
          </View>

          <View style={styles.variantListContainer}>
            {variants.map((v) => (
              <View key={v.id} style={styles.variantRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.variantMainText}>{v.color || "N/A"} - {v.size || "N/A"}</Text>
                  <Text style={styles.variantSubText}>Kho: {v.stock} | Giá: {v.price.toLocaleString()}đ</Text>
                </View>
                <Pressable onPress={() => removeVariant(v.id)}>
                  <Trash2 size={18} color="#EF4444" />
                </Pressable>
              </View>
            ))}
            {variants.length === 0 && (
              <Text style={styles.emptyText}>Chưa có phân loại nào.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 8 },
  title: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  saveBtn: { flexDirection: "row", backgroundColor: "#10B981", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8, alignItems: "center" },
  saveBtnText: { color: "white", fontWeight: "600" },
  scrollContent: { padding: 20, gap: 20 },
  card: { backgroundColor: "white", padding: 20, borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16, color: "#111827" },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 15, outlineStyle: "none" } as any,
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  pickBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#EFF6FF" },
  pickBtnText: { color: "#2563EB", fontWeight: "600", fontSize: 14 },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  imageWrapper: { width: 100, height: 100, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6", position: "relative" },
  previewImage: { width: "100%", height: "100%" },
  removeBtn: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(239, 68, 68, 0.8)", padding: 6, borderRadius: 20 },
  newBadge: { position: "absolute", bottom: 4, left: 4, backgroundColor: "#10B981", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  emptyImage: { flex: 1, height: 100, borderStyle: "dashed", borderWidth: 2, borderColor: "#E5E7EB", borderRadius: 12, justifyContent: "center", alignItems: "center", gap: 8 },
  emptyText: { color: "#9CA3AF", fontSize: 14 },
  uploadingOverlay: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  uploadingText: { color: "#2563EB", fontSize: 14, fontWeight: "500" },

  // Image Management Styles
  imageList: { gap: 16 },
  imageItem: { flexDirection: "row", gap: 12, backgroundColor: "#F9FAFB", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  imagePreviewContainer: { width: 80, height: 80, borderRadius: 8, overflow: "hidden", position: "relative" },
  thumbnailBadge: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "#2563EB", paddingVertical: 2, alignItems: "center" },
  thumbnailBadgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  imageControls: { flex: 1, gap: 8 },
  controlRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  smallBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: "#E5E7EB" },
  activeBtn: { backgroundColor: "#2563EB" },
  smallBtnText: { fontSize: 11, color: "#4B5563", fontWeight: "600" },
  activeBtnText: { color: "white" },
  removeIconBtn: { padding: 4 },
  typeSelector: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 4, alignItems: "center", borderRadius: 4, borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "white" },
  activeTypeBtn: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  typeBtnText: { fontSize: 12, color: "#6B7280" },
  activeTypeBtnText: { color: "#2563EB", fontWeight: "600" },
  variantSelector: { flexDirection: "row", paddingVertical: 4 },
  variantChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "white", borderWidth: 1, borderColor: "#D1D5DB", marginRight: 8 },
  activeVariantChip: { borderColor: "#2563EB", backgroundColor: "#2563EB" },
  variantChipText: { fontSize: 11, color: "#6B7280" },
  activeVariantChipText: { color: "white", fontWeight: "600" },
  noVariantsPrompt: { fontSize: 11, color: "#9CA3AF", fontStyle: "italic" },

  variantForm: { flexDirection: "row", gap: 10, alignItems: "flex-end", marginBottom: 20 },
  inputLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  smallInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 6, padding: 8, fontSize: 13, outlineStyle: "none" } as any,
  addVariantBtn: { backgroundColor: "#2563EB", padding: 8, borderRadius: 6, justifyContent: "center" },
  variantListContainer: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  variantRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  variantMainText: { fontSize: 14, fontWeight: "600", color: "#111827" },
  variantSubText: { fontSize: 12, color: "#6B7280" },
});