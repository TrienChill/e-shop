import React from "react";
import { StyleSheet, Text, View } from "react-native";

// ─── Hàm định dạng số tiền VNĐ ───────────────────────────────────────────────
const formatVND = (price: number) => price?.toLocaleString("vi-VN") ?? "0";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface PriceDisplayProps {
  /** Giá gốc (trước giảm giá) */
  originalPrice: number;
  /** Giá sau giảm – bắt buộc khi hasDiscount = true */
  finalPrice?: number;
  /** Có đang áp dụng giảm giá không */
  hasDiscount?: boolean;
  /**
   * Kích cỡ hiển thị:
   *  - "sm"  → dùng trong card nhỏ (PopularCard, danh sách ngang)
   *  - "md"  → dùng trong card trung bình (màn hình chính)
   *  - "lg"  → dùng trong trang chi tiết sản phẩm
   */
  size?: "sm" | "md" | "lg";
  /** Căn lề ngang của container (mặc định "flex-start") */
  justify?: "flex-start" | "center" | "flex-end";
  /** Ẩn badge phần trăm giảm giá (mặc định hiện) */
  hideDiscountBadge?: boolean;
}

// ─── Cấu hình kích cỡ font theo từng variant ─────────────────────────────────
const sizeConfig = {
  sm: { final: 15, original: 11 },
  md: { final: 15, original: 12 },
  lg: { final: 26, original: 16 },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────
export function PriceDisplay({
  originalPrice,
  finalPrice,
  hasDiscount = false,
  size = "sm",
  justify = "flex-start",
  hideDiscountBadge = false,
}: PriceDisplayProps) {
  const { final: finalSize, original: originalSize } = sizeConfig[size];

  // Tính phần trăm giảm giá
  const discountPercent =
    hasDiscount && finalPrice && originalPrice > 0
      ? Math.round((1 - finalPrice / originalPrice) * 100)
      : 0;

  return (
    <View
      style={[
        styles.container,
        { justifyContent: justify },
        size === "lg" && styles.containerLg,
      ]}
    >
      {hasDiscount && finalPrice != null ? (
        <>
          {/* Giá sau giảm – màu đỏ */}
          <View style={styles.row}>
            <Text style={[styles.finalPrice, { fontSize: finalSize }]}>
              {formatVND(finalPrice)}
              <Text style={{ fontSize: finalSize * 0.7 }}> đ</Text>
            </Text>

            {/* Phần trăm giảm giá - Badge nổi bật */}
            {discountPercent > 0 && !hideDiscountBadge && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>-{discountPercent}%</Text>
              </View>
            )}
          </View>

          {/* Giá gốc – gạch ngang */}
          <Text style={[styles.originalPrice, { fontSize: originalSize }]}>
            {formatVND(originalPrice)}₫
          </Text>
        </>
      ) : (
        /* Không có giảm giá – màu đen */
        <Text style={[styles.normalPrice, { fontSize: finalSize }]}>
          {formatVND(originalPrice)}
          <Text style={{ fontSize: finalSize * 0.7 }}> đ</Text>
        </Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginTop: 4,
  },
  /** Variant lg dùng baseline thay vì center để giá gốc nhỏ hơn trông tự nhiên */
  containerLg: {
    alignItems: "flex-start",
    marginTop: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  finalPrice: {
    fontWeight: "700",
    color: "#EF4444",
  },
  originalPrice: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontWeight: "500",
    marginTop: -2,
  },
  normalPrice: {
    fontWeight: "700",
    color: "#111827",
  },
  discountBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "800",
  },
});

export default PriceDisplay;
