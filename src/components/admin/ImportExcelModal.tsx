import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CheckCircle, FileSpreadsheet, Upload, X, XCircle } from "lucide-react-native";
import { importProductsFromExcel } from "../../utils/excel";

interface ImportExcelModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportStatus = "idle" | "ready" | "loading" | "success" | "error";

export default function ImportExcelModal({
  visible,
  onClose,
  onSuccess,
}: ImportExcelModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Web-only: ref cho hidden <input> và drop zone <div>
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    const validExtensions = [".xlsx", ".xls"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
      setStatus("error");
      setMessage("Vui lòng chọn file Excel (.xlsx hoặc .xls).");
      return;
    }

    setSelectedFile(file);
    setStatus("ready");
    setMessage("");
  }, []);

  // ─── Gắn Drag & Drop event listeners trực tiếp vào DOM (web only) ────────
  // Lý do phải dùng useEffect + ref thay vì prop onDragOver trên Pressable:
  // React Native Web không forward các DOM drag events qua Pressable.
  useEffect(() => {
    if (Platform.OS !== "web" || !visible) return;

    // Đợi DOM render xong rồi mới lấy div
    const timer = setTimeout(() => {
      const el = dropZoneRef.current;
      if (!el) return;

      const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      };

      const onDragEnter = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      };

      const onDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Chỉ tắt khi chuột thực sự rời khỏi phần tử (không phải rời sang child)
        if (!el.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      };

      const onDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileSelect(file);
      };

      el.addEventListener("dragover", onDragOver);
      el.addEventListener("dragenter", onDragEnter);
      el.addEventListener("dragleave", onDragLeave);
      el.addEventListener("drop", onDrop);

      // Cleanup khi modal đóng hoặc unmount
      return () => {
        el.removeEventListener("dragover", onDragOver);
        el.removeEventListener("dragenter", onDragEnter);
        el.removeEventListener("dragleave", onDragLeave);
        el.removeEventListener("drop", onDrop);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [visible, handleFileSelect]);

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    setStatus("loading");
    setProgress(0);

    const result = await importProductsFromExcel(selectedFile, (p) => {
      setProgress(p);
    });

    if (result.success) {
      setStatus("success");
      setMessage(result.message);
      onSuccess();
    } else {
      setStatus("error");
      setMessage(result.message);
    }
  };

  const handleClose = () => {
    if (status === "loading") return;
    setSelectedFile(null);
    setStatus("idle");
    setProgress(0);
    setMessage("");
    setIsDragging(false);
    onClose();
  };

  // ─── Drop Zone render ────────────────────────────────────────────────────
  const renderDropZone = () => {
    if (Platform.OS !== "web") {
      return (
        <View style={styles.dropZone}>
          <FileSpreadsheet size={40} color="#9CA3AF" />
          <Text style={styles.dropZoneText}>
            Chức năng Import chỉ hỗ trợ trên trình duyệt web.
          </Text>
        </View>
      );
    }

    // Trên web: render div thật để drag & drop hoạt động,
    // React Native's Pressable không hỗ trợ DragEvent.
    const dropZoneStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      border: `2px dashed ${isDragging ? "#2563EB" : "#D1D5DB"}`,
      borderRadius: 12,
      paddingTop: 36,
      paddingBottom: 36,
      paddingLeft: 24,
      paddingRight: 24,
      gap: 8,
      backgroundColor: isDragging ? "#EFF6FF" : "#F9FAFB",
      cursor: "pointer",
      transition: "all 0.2s ease",
      userSelect: "none",
    };

    return (
      // @ts-ignore - div không có trong React Native types nhưng hợp lệ trên web
      <div
        ref={dropZoneRef}
        style={dropZoneStyle}
        onClick={() => fileInputRef.current?.click()}
      >
        <FileSpreadsheet size={40} color={isDragging ? "#2563EB" : "#9CA3AF"} />

        <span
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: isDragging ? "#2563EB" : "#374151",
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {isDragging ? "🎯 Thả file vào đây!" : "Kéo thả file Excel vào đây"}
        </span>

        <span style={{ fontSize: 13, color: "#6B7280" }}>
          hoặc{" "}
          <span
            style={{
              color: "#2563EB",
              fontWeight: "600",
              textDecoration: "underline",
            }}
          >
            chọn từ máy tính
          </span>
        </span>

        <span style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
          Hỗ trợ: .xlsx, .xls
        </span>

        {/* Hidden native file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e: any) => {
            const file = e.target?.files?.[0];
            if (file) handleFileSelect(file);
            // Reset input để có thể chọn lại cùng file
            e.target.value = "";
          }}
        />
      </div>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* ── Header ── */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Upload size={20} color="#2563EB" />
              <Text style={styles.modalTitle}>Nhập dữ liệu từ Excel</Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={styles.closeBtn}
              disabled={status === "loading"}
            >
              <X size={20} color={status === "loading" ? "#D1D5DB" : "#6B7280"} />
            </Pressable>
          </View>

          {/* ── Body ── */}
          <View style={styles.modalBody}>
            {/* Drop zone (idle / ready / error) */}
            {(status === "idle" || status === "ready" || status === "error") && (
              <>
                {renderDropZone()}

                {/* File đã chọn */}
                {selectedFile && (
                  <View style={styles.filePreview}>
                    <FileSpreadsheet size={18} color="#10B981" />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setSelectedFile(null);
                        setStatus("idle");
                        setMessage("");
                      }}
                    >
                      <X size={16} color="#9CA3AF" />
                    </Pressable>
                  </View>
                )}

                {/* Error banner */}
                {status === "error" && message ? (
                  <View style={styles.errorBanner}>
                    <XCircle size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{message}</Text>
                  </View>
                ) : null}
              </>
            )}

            {/* Loading với Progress bar */}
            {status === "loading" && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>
                  Đang xử lý... {Math.round(progress)}%
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressBar, { width: `${progress}%` as any }]}
                  />
                </View>
                <Text style={styles.loadingHint}>
                  Vui lòng không đóng cửa sổ này
                </Text>
              </View>
            )}

            {/* Success */}
            {status === "success" && (
              <View style={styles.resultContainer}>
                <View style={styles.successIcon}>
                  <CheckCircle size={48} color="#10B981" />
                </View>
                <Text style={styles.resultTitle}>Thành công!</Text>
                <Text style={styles.resultMessage}>{message}</Text>
              </View>
            )}

            {/* Hướng dẫn định dạng (chỉ hiện lúc idle) */}
            {status === "idle" && (
              <View style={styles.guide}>
                <Text style={styles.guideTitle}>📋 Định dạng yêu cầu:</Text>
                <Text style={styles.guideText}>
                  File Excel cần có các cột:{"\n"}
                  • <Text style={styles.boldText}>Tên sản phẩm</Text> (bắt buộc){"\n"}
                  • Giá cơ bản, Mô tả ngắn, Trạng thái{"\n"}
                  • Mã SKU, Màu sắc, Kích thước, Giá bán, Số lượng tồn kho{"\n"}
                  💡 Xuất file mẫu bằng nút "Xuất Excel" để có đúng định dạng.
                </Text>
              </View>
            )}
          </View>

          {/* ── Footer ── */}
          <View style={styles.modalFooter}>
            {status !== "success" && (
              <Pressable
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={status === "loading"}
              >
                <Text style={styles.cancelBtnText}>Huỷ</Text>
              </Pressable>
            )}

            {(status === "idle" || status === "ready" || status === "error") && (
              <Pressable
                style={[
                  styles.confirmBtn,
                  !selectedFile && styles.confirmBtnDisabled,
                ]}
                onPress={handleConfirmUpload}
                disabled={!selectedFile}
              >
                <Upload size={16} color="white" />
                <Text style={styles.confirmBtnText}>Xác nhận tải lên</Text>
              </Pressable>
            )}

            {status === "success" && (
              <Pressable style={styles.confirmBtn} onPress={handleClose}>
                <Text style={styles.confirmBtnText}>Đóng</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalBox: {
    backgroundColor: "white",
    borderRadius: 16,
    width: "100%",
    maxWidth: 520,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
    gap: 16,
  },
  // ── Drop Zone (mobile fallback only, web uses inline div style) ──
  dropZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
  } as any,
  dropZoneText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
  },
  // ── File Preview ──
  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#065F46",
  },
  // ── Loading ──
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  progressTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 99,
  },
  loadingHint: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  // ── Result ──
  resultContainer: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  successIcon: {
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 99,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#065F46",
  },
  resultMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  // ── Error Banner ──
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
    lineHeight: 18,
  },
  // ── Guide ──
  guide: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D4ED8",
    marginBottom: 4,
  },
  guideText: {
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "700",
  },
  // ── Footer ──
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#2563EB",
  },
  confirmBtnDisabled: {
    backgroundColor: "#93C5FD",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
});
