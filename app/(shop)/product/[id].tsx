import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  Share2,
  ShoppingCart,
  Star,
  Tag,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "@/src/lib/supabase"; // <-- Đảm bảo import supabase đúng đường dẫn của bạn
import { SafeAreaView } from "react-native-safe-area-context";

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const BUCKET_NAME = "product-imagess"; // Tên bucket chứa ảnh của bạn

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.42;

// Hàm định dạng tiền tệ VNĐ (chỉ trả về chuỗi số)
const formatVND = (price: number) => {
  return price.toLocaleString("vi-VN");
};

// ─────────────────────────── Dữ liệu giả ───────────────────────────

const REVIEWS = [
  {
    id: "r1",
    user: "Trần Thu Hà",
    avatar: "https://i.pravatar.cc/100?img=5",
    rating: 4,
    date: "15/12/2025",
    score: "4/5",
    comment:
      "Áo đẹp, chất vải mát mẻ rất hợp mặc mùa hè. Giao hàng nhanh và đóng gói cẩn thận. Sẽ ủng hộ shop tiếp!",
  },
  {
    id: "r2",
    user: "Nguyễn Minh Anh",
    avatar: "https://i.pravatar.cc/100?img=9",
    rating: 5,
    date: "20/11/2025",
    score: "5/5",
    comment:
      "Rất hài lòng với sản phẩm này! Màu sắc y hình, mặc lên tôn dáng. Shop tư vấn rất nhiệt tình.",
  },
];

const POPULAR_PRODUCTS = [
  {
    id: "p1",
    name: "Váy Hoa Dáng Xòe",
    price: 450000,
    badge: "Mới",
    badgeColor: "#22C55E",
    image:
      "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=300&q=80",
  },
  {
    id: "p2",
    name: "Chân Váy Ngắn Hồng",
    price: 380000,
    badge: "Giảm giá",
    badgeColor: "#3B82F6",
    image:
      "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=300&q=80",
  },
  {
    id: "p3",
    name: "Đầm Dự Tiệc Đỏ",
    price: 650000,
    badge: "Nổi bật",
    badgeColor: "#EF4444",
    image:
      "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=300&q=80",
  },
  {
    id: "p4",
    name: "Bộ Lanh Phối Đồ",
    price: 320000,
    badge: "Mới",
    badgeColor: "#22C55E",
    image:
      "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=300&q=80",
  },
];

//Màu sắc tiếng Việt
const colorTranslations: Record<string, string> = {
  Black: "Đen",
  White: "Trắng",
  Red: "Đỏ",
  Blue: "Xanh dương",
  Yellow: "Vàng",
  Green: "Xanh lá",
  Pink: "Hồng",
  Gray: "Xám",
  Orange: "Cam",
  Brown: "Nâu",
  Purple: "Tím",
  // Thêm các màu khác nếu database của bạn có
};

// ──────────────────────── Component phụ ─────────────────────────

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color={i <= rating ? "#FBBF24" : "#D1D5DB"}
          fill={i <= rating ? "#FBBF24" : "transparent"}
        />
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: (typeof REVIEWS)[0] }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Image source={{ uri: review.avatar }} style={styles.avatar} />
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewerName}>{review.user}</Text>
          <StarRow rating={review.rating} />
        </View>
        <View style={styles.reviewScore}>
          <Text style={styles.reviewDate}>{review.date}</Text>
          <Text style={styles.scoreText}>{review.score}</Text>
        </View>
      </View>
      <Text style={styles.reviewComment}>{review.comment}</Text>
    </View>
  );
}

function PopularCard({ item }: { item: (typeof POPULAR_PRODUCTS)[0] }) {
  const [liked, setLiked] = useState(false);
  return (
    <View style={styles.popularCard}>
      <View style={styles.popularImageWrapper}>
        <Image source={{ uri: item.image }} style={styles.popularImage} />
        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
        {/* Heart */}
        <TouchableOpacity
          style={styles.heartBtn}
          activeOpacity={0.7}
          onPress={() => setLiked((p) => !p)}
        >
          <Heart
            size={14}
            color={liked ? "#EF4444" : "#6B7280"}
            fill={liked ? "#EF4444" : "transparent"}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.popularPrice}>
        {formatVND(item.price)}
        <Text style={{ fontSize: 11 }}> đ</Text>
      </Text>
      <Text style={styles.popularName} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );
}

// ──────────────────────── Màn hình chính ────────────────────────────

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // 1. Khai báo state lưu dữ liệu sản phẩm thật
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [wishlist, setWishlist] = useState(false);

  // Lưu trữ màu đang được chọn
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // 1. Tạo ref cho ScrollView ảnh
  const imageScrollRef = useRef<ScrollView>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  // Hàm xử lý khi người dùng vuốt ảnh
  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    // Tính toán index của ảnh dựa trên vị trí cuộn và chiều rộng màn hình
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  // 2. Fetch dữ liệu từ Supabase
  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setProduct(data);

        // Thiết lập giá trị mặc định cho Size và Color từ JSON 'variants'
        if (data?.variants) {
          if (data.variants.sizes?.length > 0) {
            setSelectedSize(data.variants.sizes[0]);
          }
          if (data.variants.options?.length > 0) {
            setSelectedColor(data.variants.options[0]);
          }
        }
      } catch (error) {
        console.error("Lỗi lấy chi tiết sản phẩm:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProductDetail();
  }, [id]);

  // 3. Hiển thị loading trong lúc đợi dữ liệu
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Nếu không có sản phẩm
  if (!product) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Không tìm thấy sản phẩm!</Text>
      </View>
    );
  }

  // 4. Xử lý mảng hình ảnh từ Supabase
  const productImages =
    product.images && product.images.length > 0
      ? product.images.map((img: string) =>
          img.startsWith("http")
            ? img
            : `${BASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${img}`,
        )
      : ["https://via.placeholder.com/600"];

  // 3. Hàm xử lý cuộn ảnh khi chọn màu
  const handleSelectColor = (option: any) => {
    setSelectedColor(option);

    // Nếu có ref và có image_index hợp lệ, cuộn tới ảnh đó
    if (imageScrollRef.current && option.image_index !== undefined) {
      // Tính toán vị trí x cần cuộn đến (chiều rộng màn hình * index của ảnh)
      const offset_x = option.image_index * SCREEN_WIDTH;
      imageScrollRef.current.scrollTo({ x: offset_x, y: 0, animated: true });
      setActiveIndex(option.image_index); // Cập nhật lại dấu chấm
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Nút quay lại ── */}
      <TouchableOpacity
        style={styles.backBtn}
        activeOpacity={0.8}
        onPress={() => router.back()}
      >
        <ArrowLeft size={20} color="#111" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════ 1. Ảnh sản phẩm ══════════════ */}
        <View style={styles.heroContainer}>
          <ScrollView
            horizontal
            pagingEnabled // Bật chế độ lướt từng trang (từng ảnh)
            showsHorizontalScrollIndicator={false} // Ẩn thanh cuộn ngang
            onScroll={handleScroll}
            scrollEventThrottle={16} // Giúp bắt sự kiện cuộn mượt mà hơn
            ref={imageScrollRef} // <--- Gắn ref vào đây
          >
            {productImages && productImages.length > 0 ? (
              productImages.map((imageUrl: string, index: number) => (
                <Image
                  key={index}
                  source={{ uri: imageUrl }}
                  // Ép chiều rộng của mỗi ảnh bằng đúng chiều rộng màn hình (SCREEN_WIDTH)
                  style={[styles.heroImage, { width: SCREEN_WIDTH }]}
                  resizeMode="contain"
                />
              ))
            ) : (
              <Image
                source={{ uri: "https://via.placeholder.com/600" }}
                style={[styles.heroImage, { width: SCREEN_WIDTH }]}
                resizeMode="contain"
              />
            )}
          </ScrollView>

          {/* Lớp phủ gradient ở dưới để tạo kiểu */}
          <View style={styles.heroGradient} />

          {/* Dấu chấm chuyển trang (Pagination Dots) */}
          {productImages && productImages.length > 1 && (
            <View style={styles.pagination}>
              {productImages.map((_: string, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    activeIndex === index
                      ? styles.activeDot
                      : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ══════════════ 2. Thông tin sản phẩm ══════════════ */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            {/* Lấy giá từ state product */}
            <Text style={styles.price}>
              {product.price ? formatVND(product.price) : "0"}
              <Text style={{ fontSize: 19 }}> đ</Text>
            </Text>
            <TouchableOpacity style={styles.shareBtn} activeOpacity={0.7}>
              <Share2 size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          {/* Lấy tên từ state product */}
          <Text style={styles.productName}>{product.name}</Text>
          {/* Lấy mô tả từ state product */}
          <Text style={styles.productDescription}>{product.description}</Text>
        </View>

        {/* Đường kẻ chia */}
        <View style={styles.divider} />

        {/* ══════════════ 3. Kích cỡ & Màu sắc ══════════════ */}
        <View style={styles.section}>
          {/* ---- Chọn Kích Cỡ (Sizes) ---- */}
          {product.variants?.sizes && product.variants.sizes.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Kích cỡ</Text>
                <Text style={styles.variantInfoText}>{selectedSize}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.variantList}
              >
                {product.variants.sizes.map((size: string, index: number) => {
                  const isSelected = selectedSize === size;
                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.8}
                      onPress={() => setSelectedSize(size)}
                      style={[
                        styles.chip, // Dùng lại style chip có sẵn
                        {
                          borderWidth: 1,
                          borderColor: isSelected ? "#3B82F6" : "#E5E7EB",
                          backgroundColor: isSelected ? "#EFF6FF" : "#F9FAFB",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isSelected ? "#3B82F6" : "#374151",
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ---- Chọn Màu Sắc (Colors/Options) ---- */}
          {product.variants?.options && product.variants.options.length > 0 && (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Màu sắc</Text>
                <Text style={styles.variantInfoText}>
                  {/* Kiểm tra và dịch tên màu */}
                  {selectedColor?.color
                    ? colorTranslations[selectedColor.color] ||
                      selectedColor.color
                    : ""}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.variantList}
              >
                {product.variants.options.map((option: any, index: number) => {
                  const isSelected = selectedColor?.color === option.color;
                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.8}
                      onPress={() => handleSelectColor(option)}
                      // Trả về một hình tròn nhỏ hiển thị mã màu HEX
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: option.hex,
                        marginRight: 12,
                        borderWidth: isSelected ? 3 : 1,
                        borderColor: isSelected ? "#3B82F6" : "#D1D5DB", // Viền xanh nếu đang chọn
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 3,
                        elevation: 2,
                      }}
                    />
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Đường kẻ chia */}
        <View style={styles.divider} />

        {/* ══════════════ 4. Thông số & Mô tả ══════════════ */}
        {/* ══════════════ 4. Thông số kỹ thuật ══════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông số kỹ thuật</Text>

          {product.specifications && product.specifications.length > 0 ? (
            product.specifications.map((spec: any, index: number) => (
              <View key={index} style={styles.specRow}>
                <Text style={styles.specLabel}>{spec.label}</Text>
                <View style={styles.specChips}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{spec.value}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ color: "#9CA3AF", fontSize: 13 }}>
              Đang cập nhật thông số...
            </Text>
          )}
        </View>

        {/* Đường kẻ chia */}
        <View style={styles.divider} />

        {/* ══════════════ 5. Giao hàng ══════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giao hàng</Text>

          {(
            product.shipping_info || [
              { type: "Tiêu chuẩn", time: "5-7 ngày", price: 30000 },
              { type: "Hỏa tốc", time: "1-2 ngày", price: 50000 },
            ]
          ).map((d: any) => (
            <View key={d.type} style={styles.deliveryRow}>
              <Text style={styles.deliveryType}>{d.type}</Text>
              <View style={styles.deliveryMeta}>
                <View style={styles.deliveryTimeBadge}>
                  <Text style={styles.deliveryTimeText}>{d.time}</Text>
                </View>

                {/* Phần hiển thị giá VNĐ */}
                <Text style={styles.deliveryPrice}>
                  {(d.price || 0).toLocaleString("vi-VN")}
                  <Text
                    style={{ fontSize: styles.deliveryPrice.fontSize * 0.75 }}
                  >
                    {" "}
                    đ
                  </Text>
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Đường kẻ chia */}
        <View style={styles.divider} />

        {/* ══════════════ 6. Đánh giá & Nhận xét ══════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đánh giá &amp; Nhận xét</Text>

          {/* Tổng số sao */}
          <View style={styles.overallRating}>
            <StarRow rating={4} size={20} />
            <Text style={styles.overallScore}>4/5</Text>
          </View>

          {/* Nhận xét cá nhân */}
          {REVIEWS.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}

          {/* Xem tất cả */}
          <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.8}>
            <Text style={styles.viewAllText}>Xem tất cả nhận xét</Text>
          </TouchableOpacity>
        </View>

        {/* Đường kẻ chia */}
        <View style={styles.divider} />

        {/* ══════════════ 7. Sản phẩm phổ biến ══════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sản phẩm phổ biến</Text>
            <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <ChevronRight size={14} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          <View style={styles.popularGrid}>
            {POPULAR_PRODUCTS.map((item) => (
              <PopularCard key={item.id} item={item} />
            ))}
          </View>
        </View>

        {/* Khoảng trống dưới để không bị thanh công cụ che khuất */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ══════════════ 8. Thanh công cụ dưới (Cố định) ══════════════ */}
      <View style={styles.actionBar}>
        {/* Các biểu tượng bên trái */}
        <View style={styles.actionIcons}>
          <TouchableOpacity
            style={styles.actionIcon}
            activeOpacity={0.7}
            onPress={() => setWishlist((p) => !p)}
          >
            <Heart
              size={22}
              color={wishlist ? "#EF4444" : "#fff"}
              fill={wishlist ? "#EF4444" : "transparent"}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionIcon} activeOpacity={0.7}>
            <ShoppingCart size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.discountBadge} activeOpacity={0.7}>
            <Tag size={14} color="#FBBF24" />
            <Text style={styles.discountText}>GIẢM 10%</Text>
          </TouchableOpacity>
        </View>

        {/* Nút Thêm vào giỏ */}
        <TouchableOpacity style={styles.addBagBtn} activeOpacity={0.85}>
          <Text style={styles.addBagText}>Thêm vào giỏ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ──────────────────────── Styles ─────────────────────────────────

const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const styles = StyleSheet.create({
  // ── Pagination Dots ──
  pagination: {
    position: "absolute",
    bottom: 20, // Nằm cách đáy khung ảnh 20px
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#3B82F6", // Màu xanh dương nổi bật (theo theme của bạn)
    width: 20, // Chấm active dài ra một chút cho hiện đại
  },
  inactiveDot: {
    backgroundColor: "rgba(0, 0, 0, 0.2)", // Chấm mờ cho ảnh chưa xem
    width: 8,
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Nút quay lại
  backBtn: {
    position: "absolute",
    top: 14,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },

  // ── Hero ──
  heroContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: "#F3F4F6",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(255,255,255,0.0)",
  },

  // ── Sections ──
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  // ── Price Row ──
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  price: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.3,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },

  // ── Variants ──
  variantInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  variantInfoText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  variantInfoSep: {
    fontSize: 12,
    color: "#93C5FD",
  },
  variantList: {
    paddingVertical: 4,
    gap: 10,
  },
  variantThumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  variantThumbSelected: {
    borderColor: "#3B82F6",
  },
  variantImage: {
    width: "100%",
    height: "100%",
  },

  // ── Specifications ──
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  specRowLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  specLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    minWidth: 70,
  },
  specChips: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },

  // ── Delivery ──
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  deliveryType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  deliveryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deliveryTimeBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  deliveryTimeText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  deliveryPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    minWidth: 46,
    textAlign: "right",
  },

  // ── Reviews ──
  overallRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  overallScore: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  reviewMeta: {
    flex: 1,
    gap: 4,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  reviewScore: {
    alignItems: "flex-end",
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FBBF24",
  },
  reviewComment: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },
  viewAllBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  viewAllText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Popular Grid ──
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "600",
  },
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  popularCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  popularImageWrapper: {
    position: "relative",
    width: "100%",
    height: CARD_WIDTH * 1.1,
  },
  popularImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  heartBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  popularPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  popularName: {
    fontSize: 12,
    color: "#6B7280",
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginTop: 2,
  },

  // ── Bottom Action Bar ──
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 10,
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251,191,36,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  discountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FBBF24",
  },
  addBagBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  addBagText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
