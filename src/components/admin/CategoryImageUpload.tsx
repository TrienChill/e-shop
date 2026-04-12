// src/components/admin/CategoryImageUpload.tsx
// Quản lý ảnh danh mục — upload lên Supabase Storage bucket "category-images"

import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ImagePlus, Trash2, Upload } from "lucide-react-native";
import { supabase } from "@/src/lib/supabase";
import { updateCategory } from "@/src/utils/categoryTree";

interface Props {
  categoryId: number;
  currentImageUrl: string | null;
  categoryName: string;
  onUpdated: (newUrl: string | null) => void; // callback sau khi update
}

const BUCKET = "category-images";
const PLACEHOLDER = "https://via.placeholder.com/120x80?text=No+Image";

export default function CategoryImageUpload({
  categoryId,
  currentImageUrl,
  categoryName,
  onUpdated,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Upload logic ──────────────────────────────────────────────────────────

  const uploadFile = async (file: File) => {
    // Validate
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn file ảnh (JPG, PNG, WebP)", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Ảnh phải nhỏ hơn 5MB", "error");
      return;
    }

    setUploading(true);
    try {
      // Preview ngay lập tức
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      // Tạo path unique
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `category_${categoryId}_${Date.now()}.${ext}`;

      // Upload lên Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Lấy public URL
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = data.publicUrl;

      // Cập nhật DB
      await updateCategory(categoryId, { image_url: publicUrl });

      setPreviewUrl(publicUrl);
      onUpdated(publicUrl);
      showToast("✅ Cập nhật ảnh thành công!");
    } catch (err: any) {
      setPreviewUrl(currentImageUrl);
      showToast("❌ Lỗi upload: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    const ok = Platform.OS === "web"
      ? window.confirm(`Xóa ảnh danh mục "${categoryName}"?`)
      : true;
    if (!ok) return;

    setUploading(true);
    try {
      await updateCategory(categoryId, { image_url: null });
      setPreviewUrl(null);
      onUpdated(null);
      showToast("✅ Đã xóa ảnh danh mục");
    } catch (err: any) {
      showToast("❌ Lỗi: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // ─── Web drag & drop ───────────────────────────────────────────────────────

  React.useEffect(() => {
    if (Platform.OS !== "web") return;
    const timer = setTimeout(() => {
      const el = dropRef.current;
      if (!el) return;

      const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
      const onDragLeave = (e: DragEvent) => { if (!el.contains(e.relatedTarget as Node)) setIsDragging(false); };
      const onDrop = (e: DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) uploadFile(file);
      };

      el.addEventListener("dragover", onDragOver);
      el.addEventListener("dragleave", onDragLeave);
      el.addEventListener("drop", onDrop);
      return () => {
        el.removeEventListener("dragover", onDragOver);
        el.removeEventListener("dragleave", onDragLeave);
        el.removeEventListener("drop", onDrop);
      };
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>ẢNH ĐẠI DIỆN DANH MỤC</Text>

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.type === "error" ? styles.toastError : styles.toastSuccess]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}

      <View style={styles.row}>
        {/* Preview */}
        <View style={styles.previewBox}>
          {uploading ? (
            <ActivityIndicator color="#2563EB" />
          ) : (
            <Image
              source={{ uri: previewUrl || PLACEHOLDER }}
              style={styles.previewImg}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {Platform.OS === "web" ? (
            // @ts-ignore
            <div
              ref={dropRef}
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: `2px dashed ${isDragging ? "#2563EB" : "#D1D5DB"}`,
                borderRadius: 10,
                padding: "12px 20px",
                background: isDragging ? "#EFF6FF" : "#F9FAFB",
                cursor: uploading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                gap: 6,
                minWidth: 160,
              }}
            >
              <Upload size={20} color={isDragging ? "#2563EB" : "#6B7280"} />
              <span style={{ fontSize: 12, fontWeight: 600, color: isDragging ? "#2563EB" : "#374151" }}>
                {isDragging ? "Thả ảnh vào đây" : "Kéo thả hoặc chọn ảnh"}
              </span>
              <span style={{ fontSize: 11, color: "#9CA3AF" }}>JPG, PNG, WebP · Tối đa 5MB</span>
              {/* @ts-ignore */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e: any) => {
                  const f = e.target?.files?.[0];
                  if (f) uploadFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <Pressable
              style={[styles.uploadBtn, uploading && { opacity: 0.5 }]}
              onPress={() => showToast("Upload chỉ hỗ trợ trên Web", "error")}
            >
              <ImagePlus size={18} color="#2563EB" />
              <Text style={styles.uploadBtnText}>Chọn ảnh</Text>
            </Pressable>
          )}

          {previewUrl && (
            <Pressable
              style={[styles.deleteBtn, uploading && { opacity: 0.5 }]}
              onPress={handleDeleteImage}
              disabled={uploading}
            >
              <Trash2 size={15} color="#EF4444" />
              <Text style={styles.deleteBtnText}>Xóa ảnh</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
    padding: 14,
    backgroundColor: "#F0F7FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  previewBox: {
    width: 100,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  previewImg: {
    width: "100%",
    height: "100%",
  },
  actions: {
    flex: 1,
    gap: 8,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignSelf: "flex-start",
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    alignSelf: "flex-start",
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  toast: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  toastSuccess: { backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#A7F3D0" },
  toastError: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  toastText: { fontSize: 13, fontWeight: "600", color: "#374151" },
});
