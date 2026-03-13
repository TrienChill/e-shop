import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  Share2,
  Star
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "@/src/lib/supabase"; // <-- Đảm bảo import supabase đúng đường dẫn của bạn
import { SafeAreaView } from "react-native-safe-area-context";

import { PopularCard } from "@/src/components/card/PopularCard";
import { PriceDisplay } from "@/src/components/common/PriceDisplay";
import { calculateDiscountedPrice, getPopularProducts } from "@/src/services/product";

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const BUCKET_NAME = "product-images"; // Tên bucket chứa ảnh của bạn

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.42;
const CARD_WIDTH = (SCREEN_WIDTH - 46) / 2; // Adjusted for gap

// Hàm định dạng tiền tệ VNĐ (chỉ trả về chuỗi số)
const formatVND = (price: number) => {
  return price.toLocaleString("vi-VN");
};

// ─────────────────────────── Dữ liệu giả ───────────────────────────

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

  // Thêm State cho Pop-up và Số lượng
  const [isModalVisible, setModalVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // 1. Tạo ref cho ScrollView ảnh
  const imageScrollRef = useRef<ScrollView>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  // State lưu trữ đánh giá và điểm trung bình của sản phẩm
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(0);

  const [popularProducts, setPopularProducts] = useState<any[]>([]);

  // Hàm xử lý khi người dùng vuốt ảnh
  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    // Tính toán index của ảnh dựa trên vị trí cuộn và chiều rộng màn hình
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  // Hàm xử lý Thêm vào giỏ từ màn hình chính
  const handleAddToBag = () => {
    if (!selectedSize || !selectedColor) {
      setModalVisible(true);
      return;
    }
    // Đã chọn đủ ở ngoài -> Thêm vào với số lượng là 1 (hoặc quantity hiện tại)
    addToCartService(1);
  };

  // Hàm xử lý xác nhận bên trong Pop-up Modal
  const handleConfirmModal = () => {
    if (!selectedSize || !selectedColor) {
      alert("Vui lòng chọn đầy đủ màu sắc và kích cỡ!");
      return;
    }
    // Thực hiện thêm vào giỏ với số lượng 'quantity' từ Modal
    addToCartService(quantity);
  };

  const addToCartService = async (selectedQty: number) => {
    try {
      // 1. Lấy thông tin User hiện tại
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Vui lòng đăng nhập để thực hiện thao tác này!");
        return;
      }

      // 2. Tìm sản phẩm cùng loại trong giỏ (khớp ID, Size và Color)
      const { data: existingItem, error: fetchError } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .eq("size", selectedSize) // Khớp cột size
        .eq("color", selectedColor?.color) // Khớp cột color
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingItem) {
        // 3. Nếu đã tồn tại -> Cập nhật tăng số lượng
        const { error: updateError } = await supabase
          .from("cart_items")
          .update({
            quantity: existingItem.quantity + selectedQty,
            updated_at: new Date(),
          })
          .eq("id", existingItem.id);

        if (updateError) throw updateError;
      } else {
        // 4. Nếu chưa có -> Thêm dòng mới
        const { error: insertError } = await supabase
          .from("cart_items")
          .insert([
            {
              user_id: user.id,
              product_id: product.id,
              quantity: selectedQty,
              size: selectedSize,
              color: selectedColor?.color,
              is_selected: true,
            },
          ]);

        if (insertError) throw insertError;
      }

      alert("Đã thêm vào giỏ hàng thành công!");
      setModalVisible(false); // Đóng Pop-up nếu đang mở
    } catch (error: any) {
      console.error("Lỗi giỏ hàng:", error.message);
      alert("Lỗi: " + error.message);
    }
  };

  // 2. Fetch dữ liệu từ Supabase
  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            product_discounts (
              discounts (*)
            )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        
        // Tính toán giá giảm giá
        const productWithDiscount = calculateDiscountedPrice(data);
        setProduct(productWithDiscount);

        // Đảm bảo ban đầu là null
        setSelectedSize(null);
        setSelectedColor(null);
      } catch (error) {
        console.error("Lỗi lấy chi tiết sản phẩm:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProductDetail();
  }, [id]);

  // Fetch review
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        // Lấy review và join với bảng profiles để lấy tên/avatar
        const { data, error } = await supabase
          .from("reviews")
          .select(
            `
    *,
    profiles (full_name, avatar_url)
  `,
          )
          .eq("product_id", id);

        if (error) throw error;

        setReviews(data || []);

        // Tính điểm trung bình
        if (data && data.length > 0) {
          const total = data.reduce((acc, curr) => acc + curr.rating, 0);
          setAverageRating(parseFloat((total / data.length).toFixed(1)));
        }
      } catch (error) {
        console.error("Lỗi lấy đánh giá:", error);
      }
    };

    if (id) fetchReviews();
  }, [id]);

  useEffect(() => {
    const fetchPopular = async () => {
      const data = await getPopularProducts(id as string); // Truyền ID để tránh gợi ý trùng sản phẩm đang xem
      setPopularProducts(data);
    };
    fetchPopular();
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
    if (selectedColor?.color === option.color) {
      setSelectedColor(null);
    } else {
      setSelectedColor(option);

      // Nếu có ref và có image_index hợp lệ, cuộn tới ảnh đó
      if (imageScrollRef.current && option.image_index !== undefined) {
        // Tính toán vị trí x cần cuộn đến (chiều rộng màn hình * index của ảnh)
        const offset_x = option.image_index * SCREEN_WIDTH;
        imageScrollRef.current.scrollTo({ x: offset_x, y: 0, animated: true });
        setActiveIndex(option.image_index); // Cập nhật lại dấu chấm
      }
    }
  };

  // Component con để hiển thị từng đánh giá
  function ReviewCard({ review }: { review: any }) {
    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Image
            source={{
              uri: review.profiles?.avatar_url || "https://i.pravatar.cc/100",
            }}
            style={styles.avatar}
          />
          <View style={styles.reviewMeta}>
            <Text style={styles.reviewerName}>
              {review.profiles?.full_name || "Người dùng"}
            </Text>
            <StarRow rating={review.rating} />
          </View>
          <View style={styles.reviewScore}>
            <Text style={styles.reviewDate}>
              {new Date(review.created_at).toLocaleDateString("vi-VN")}
            </Text>
            <Text style={styles.scoreText}>{review.rating}/5</Text>
          </View>
        </View>
        <Text style={styles.reviewComment}>{review.comment}</Text>
      </View>
    );
  }

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
            <PriceDisplay
              hasDiscount={product.hasDiscount}
              finalPrice={product.finalPrice}
              originalPrice={product.originalPrice ?? product.price ?? 0}
              size="lg"
            />
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
                      onPress={() => {
                        // Nếu size đang nhấn trùng với size đã chọn -> gán về null (hủy)
                        // Nếu khác -> gán size mới
                        setSelectedSize((prev) =>
                          prev === size ? null : size,
                        );
                      }}
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Đánh giá &amp; Nhận xét ({reviews.length})
            </Text>
          </View>

          {/* Tổng số sao động */}
          <View style={styles.overallRating}>
            <StarRow rating={Math.round(averageRating)} size={20} />
            <Text style={styles.overallScore}>{averageRating}/5</Text>
          </View>

          {/* Nhận xét từ database (chỉ hiện 2 cái đầu tiên ở trang chính) */}
          {reviews.length > 0 ? (
            reviews.slice(0, 2).map((r) => <ReviewCard key={r.id} review={r} />)
          ) : (
            <Text style={{ color: "#9CA3AF", marginVertical: 10 }}>
              Chưa có đánh giá nào cho sản phẩm này.
            </Text>
          )}

          {/* Nút Xem tất cả (chỉ hiện nếu có nhiều hơn 2 review) */}
          {reviews.length > 2 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              activeOpacity={0.8}
              onPress={() =>
                // Điều hướng chuẩn theo Typed Routes
                router.push({
                  pathname: "/product/reviews" as any,
                  params: {
                    productId: id, // Tên key phải là 'productId'
                    productName: product.name,
                  },
                })
              }
            >
              <Text style={styles.viewAllText}>
                Xem tất cả {reviews.length} nhận xét
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Đường kẻ chia */}
        <View style={styles.divider} />

        {/* ══════════════ 7. Sản phẩm phổ biến ══════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sản phẩm phổ biến</Text>
            <TouchableOpacity
              style={styles.seeAllBtn}
              activeOpacity={0.7}
              onPress={() => router.push("/product/popular-products" as any)} // Điều hướng đến trang tìm kiếm chung, có thể lọc theo sản phẩm phổ biến ở đó
            >
              <Text style={styles.seeAllText}>Xem tất cả</Text>
              <ChevronRight size={14} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          <View style={styles.popularGrid}>
            {popularProducts.length > 0 ? (
              popularProducts.map((item) => (
                <PopularCard
                  key={item.id}
                  style={{ width: CARD_WIDTH }}
                  item={{
                    ...item,
                    image:
                      item.images?.[0] || "https://via.placeholder.com/300",
                    badge: item.stock < 5 ? "Sắp hết" : "Hot",
                    badgeColor: item.stock < 5 ? "#FBBF24" : "#EF4444",
                  }}
                />
              ))
            ) : (
              // Hiển thị skeleton hoặc placeholder khi đang load
              <Text style={{ color: "#9CA3AF", padding: 10 }}>
                Đang tải gợi ý...
              </Text>
            )}
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
        </View>

        {/* Nút Thêm vào giỏ */}
        <TouchableOpacity
          style={styles.addBagBtn}
          activeOpacity={0.85}
          onPress={handleAddToBag}
        >
          <Text style={styles.addBagText}>Thêm vào giỏ</Text>
        </TouchableOpacity>
      </View>
      {/* ══════════════ 9. Pop-up Product Variations (Modal) ══════════════ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View style={styles.modalContent}>
            {/* 1. Header Pop-up: Ảnh, Giá, Lựa chọn hiện tại */}
            <View style={styles.modalHeader}>
              <Image
                source={{ uri: productImages[0] }}
                style={styles.modalThumbnail}
              />
              <View style={styles.modalProductInfo}>
                <PriceDisplay
                  hasDiscount={product?.hasDiscount}
                  finalPrice={product?.finalPrice}
                  originalPrice={product?.originalPrice ?? 0}
                  size="sm"
                />
                <View style={styles.modalSelectedChips}>
                  <Text style={styles.modalChipText}>
                    {selectedColor?.color
                      ? colorTranslations[selectedColor.color] ||
                        selectedColor.color
                      : "Chưa chọn màu"}
                  </Text>
                  <Text style={styles.modalChipText}>
                    {selectedSize ? selectedSize : "Chưa chọn size"}
                  </Text>
                </View>
              </View>
              {/* Nút tắt Pop-up */}
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{ padding: 4 }}
              >
                <Text
                  style={{ fontSize: 20, color: "#9CA3AF", fontWeight: "bold" }}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 2. Color Options */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Color Options</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {product?.variants?.options?.map(
                    (option: any, index: number) => {
                      const isSelected = selectedColor?.color === option.color;
                      return (
                        <TouchableOpacity
                          key={index}
                          activeOpacity={0.8}
                          onPress={() => handleSelectColor(option)}
                          style={[
                            styles.modalColorOption,
                            { backgroundColor: option.hex },
                            isSelected && styles.modalColorOptionSelected,
                          ]}
                        >
                          {isSelected && (
                            <View style={styles.checkMarkBadge}>
                              <Text
                                style={{
                                  color: "#fff",
                                  fontSize: 10,
                                  fontWeight: "bold",
                                }}
                              >
                                ✓
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    },
                  )}
                </ScrollView>
              </View>

              {/* 3. Size Options */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Size</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {product?.variants?.sizes?.map(
                    (size: string, index: number) => {
                      const isSelected = selectedSize === size;
                      return (
                        <TouchableOpacity
                          key={index}
                          activeOpacity={0.8}
                          onPress={() =>
                            setSelectedSize((prev) =>
                              prev === size ? null : size,
                            )
                          }
                          style={[
                            styles.modalSizeChip,
                            isSelected && styles.modalSizeChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.modalSizeText,
                              isSelected && styles.modalSizeTextSelected,
                            ]}
                          >
                            {size}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </ScrollView>
              </View>

              {/* 4. Quantity Options */}
              <View style={[styles.modalSection, styles.quantityRow]}>
                <Text style={styles.modalSectionTitle}>Quantity</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => setQuantity((q) => (q > 1 ? q - 1 : 1))}
                  >
                    <Text style={styles.quantityBtnText}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.quantityDisplay}>
                    <Text style={styles.quantityText}>{quantity}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => setQuantity((q) => q + 1)}
                  >
                    <Text style={styles.quantityBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Nút Xác Nhận Cuối Cùng */}
            <TouchableOpacity
              style={styles.confirmModalBtn}
              activeOpacity={0.85}
              onPress={handleConfirmModal}
            >
              <Text style={styles.confirmModalText}>
                Xác nhận & Thêm vào giỏ
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ──────────────────────── Styles ─────────────────────────────────

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
  // ──────────────── Pop-up (Modal) Styles ────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  modalProductInfo: {
    flex: 1,
    marginLeft: 16,
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },
  modalDiscountContainer: {
    marginBottom: 8,
  },
  modalFinalPrice: {
    fontSize: 20,
    fontWeight: "800",
    color: "#EF4444",
  },
  modalOriginalPrice: {
    fontSize: 14,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  modalSelectedChips: {
    flexDirection: "row",
    gap: 8,
  },
  modalChipText: {
    backgroundColor: "#EEF2FF",
    color: "#3B82F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  modalColorOption: {
    width: 60,
    height: 60,
    borderRadius: 8, // Hình vuông bo góc giống ảnh
    marginRight: 12,
    borderWidth: 2,
    borderColor: "transparent",
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  modalColorOptionSelected: {
    borderColor: "#3B82F6",
  },
  checkMarkBadge: {
    backgroundColor: "#3B82F6",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -6,
    marginBottom: -6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  modalSizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginRight: 10,
    minWidth: 50,
    alignItems: "center",
  },
  modalSizeChipSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  modalSizeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4B5563",
  },
  modalSizeTextSelected: {
    color: "#3B82F6",
    fontWeight: "700",
  },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  quantityBtnText: {
    fontSize: 20,
    color: "#3B82F6",
    fontWeight: "600",
  },
  quantityDisplay: {
    width: 50,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    marginHorizontal: 12,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  confirmModalBtn: {
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20, // Thêm margin bottom cho an toàn trên iOS
  },
  confirmModalText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
