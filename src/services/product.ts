// src/services/product.ts

import { supabase } from "../lib/supabase";

// Lấy top 10 sản phẩm bán chạy trong 30 ngày qua

export const getTopSellingProducts = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Lấy dữ liệu bán hàng từ order_items
    const { data: salesData, error: salesError } = await supabase
      .from("order_items")
      .select(
        `
        product_id,
        quantity,
        orders!inner(status, created_at)
      `,
      )
      .eq("orders.status", "completed")
      .gte("orders.created_at", thirtyDaysAgo.toISOString());

    if (salesError) throw salesError;

    // 2. Lấy tất cả sản phẩm (để làm fallback nếu không có lượt bán)
    const { data: allProducts, error: productsError } = await supabase
      .from("products")
      .select(
        `
        *,
        product_discounts (
          id, discount_type, discount_value, is_active, start_date, end_date
        )
      `,
      )
      .eq("is_active", true);

    if (productsError) throw productsError;

    // 3. Tính toán tổng số lượng bán (Sales Map)
    const salesMap: Record<string, number> = {};
    salesData?.forEach((item: any) => {
      salesMap[item.product_id] =
        (salesMap[item.product_id] || 0) + item.quantity;
    });

    // 4. Kết hợp dữ liệu: Gán total_sold vào danh sách sản phẩm
    const processedProducts = (allProducts || []).map((product: any) => ({
      ...product,
      total_sold: salesMap[product.id] || 0,
    }));

    // 5. Sắp xếp:
    // - Ưu tiên sản phẩm có lượt bán (total_sold giảm dần)
    // - Nếu lượt bán bằng nhau (đều là 0), sắp xếp theo ngày tạo (mới nhất lên đầu)
    const sortedProducts = processedProducts.sort((a, b) => {
      if (b.total_sold !== a.total_sold) {
        return b.total_sold - a.total_sold;
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    // 5. Tính toán giá giảm giá
    const finalProducts = sortedProducts.map(calculateDiscountedPrice);

    // Trả về 10 sản phẩm đầu tiên
    return finalProducts.slice(0, 10);
  } catch (error) {
    console.error("Lỗi lấy sản phẩm bán chạy:", error);
    return [];
  }
};

// Lấy sản phẩm đang có Flash Sale (có discount active)
export const getFlashSaleProducts = async () => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_discounts (
          id, discount_type, discount_value, is_active, start_date, end_date
        )
      `)
      .eq("is_active", true);

    if (error) throw error;

    const processed = (data || []).map(calculateDiscountedPrice);
    // Chỉ lấy những sản phẩm thực sự đang có giảm giá hợp lệ
    return processed.filter(p => p.hasDiscount);
  } catch (error) {
    console.error("Lỗi lấy sản phẩm flash sale:", error);
    return [];
  }
};

// Lấy 10 sản phẩm mới nhất

export const getLatestProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_discounts (
        id, discount_type, discount_value, is_active, start_date, end_date
      )
    `,
    ) // Phải có đoạn join này để tránh undefined
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Lỗi lấy sản phẩm mới:", error);
    return [];
  }
  return (data || []).map(calculateDiscountedPrice);
};
// Lấy 10 sản phẩm nổi tiếng nhất (dựa trên số lượt xem, đánh giá và bán hàng)

// src/services/product.ts

export const getMostPopularProducts = async () => {
  const { data, error } = await supabase.rpc("get_most_popular_products");

  if (error) {
    console.error("Lỗi fetch sản phẩm phổ biến:", error);
    return [];
  }

  // Nếu RPC không trả về product_discounts, chúng ta cần fetch thêm details
  // Lấy danh sách ID
  const productIds = data.map((p: any) => p.id);
  
  if (productIds.length === 0) return [];

  // Fetch lại details kèm discounts
  const { data: enrichedProducts, error: enrichError } = await supabase
    .from("products")
    .select(`
      *,
      product_discounts (
        id, discount_type, discount_value, is_active, start_date, end_date
      )
    `)
    .in("id", productIds);

  if (enrichError) {
    console.error("Lỗi enrich sản phẩm phổ biến:", enrichError);
    return data.map(calculateDiscountedPrice);
  }

  // Sắp xếp lại theo thứ tự của RPC ban đầu
  const result = productIds.map((id: any) => {
    const product = enrichedProducts.find((p) => p.id === id);
    return calculateDiscountedPrice(product);
  });

  return result;
};

// Lấy 20 sản phẩm có lượt bán cao hoặc mới nhất, sau đó dùng hàm sort(() => Math.random() - 0.5) để chọn ra 4 cái ngẫu nhiên hiển thị.
export const getPopularProducts = async (currentProductId?: string) => {
  try {
    // 1. Lấy danh sách sản phẩm đang hoạt động
    let query = supabase
      .from("products")
      .select(`
        *,
        product_discounts (
          id, discount_type, discount_value, is_active, start_date, end_date
        )
      `)
      .eq("is_active", true)
      .limit(20); // Lấy ứng viên từ 20 sản phẩm mới/hot nhất

    // 2. Loại bỏ sản phẩm hiện tại (nếu đang ở trang chi tiết)
    if (currentProductId) {
      query = query.neq("id", currentProductId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // 3. Tính toán giá giảm giá
    const processed = (data || []).map(calculateDiscountedPrice);

    // 4. Xáo trộn ngẫu nhiên để tạo sự mới mẻ mỗi lần load
    const shuffled = processed.sort(() => Math.random() - 0.5);

// 5. Trả về 4 sản phẩm
    return shuffled.slice(0, 4);
  } catch (error) {
    console.error("Lỗi lấy sản phẩm phổ biến:", error);
    return [];
  }
};

// Lấy sản phẩm gợi ý "Dành cho bạn" (Collaborative Filtering, Content-based, Recency & Frequency)
export const getJustForYouProducts = async (page: number = 1) => {
  try {
    // Nếu trang > 1, ngưng xài logic cá nhân hóa, bắt đầu tải đại trà các sản phẩm còn lại
    if (page > 1) {
      const limit = 8;
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_discounts (
            id, discount_type, discount_value, is_active, start_date, end_date
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);
        
      if (error) throw error;
      return (data || []).map(calculateDiscountedPrice);
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Nếu chưa đăng nhập, trả về sản phẩm phổ biến ngẫu nhiên
      return getPopularProducts();
    }

    let recommendedProductIds = new Set<string>();

    // 1. Recency & Frequency: Ưu tiên sản phẩm bỏ quên trong giỏ và mới thêm vào wishlist
    const [cartRes, wishlistRes] = await Promise.all([
      supabase.from("cart_items").select("product_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
      supabase.from("wishlist").select("product_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4)
    ]);

    const cartProductIds = (cartRes.data || []).map((item: any) => item.product_id);
    const wishlistProductIds = (wishlistRes.data || []).map((item: any) => item.product_id);
    const recentProductIds = [...new Set([...cartProductIds, ...wishlistProductIds])];

    // Nhắc nhở: đưa các sản phẩm trong giỏ vào gợi ý luôn
    recentProductIds.forEach((id: string) => recommendedProductIds.add(id));
    
    // 2. Content-based Filtering: Bạn thích cái này, có thể thích cái kia
    // Lấy các category_id của danh sách recentProductIds
    if (recentProductIds.length > 0) {
      const { data: recentProducts } = await supabase
        .from("products")
        .select("category_id")
        .in("id", recentProductIds.slice(0, 5)); // Limit in-clause to prevent long URI
        
      if (recentProducts && recentProducts.length > 0) {
        const categoryIds = [...new Set(recentProducts.map((p: any) => p.category_id))];
        const { data: similarProducts } = await supabase
          .from("products")
          .select("id")
          .in("category_id", categoryIds)
          .limit(10);
          
        similarProducts?.forEach((p: any) => recommendedProductIds.add(p.id));
      }
    }

    // Convert Set sang Array
    let finalIds = Array.from(recommendedProductIds);
    
    // Nếu quá ít, bù bằng sản phẩm nổi tiếng
    if (finalIds.length < 4) {
      const popularProducts = await getPopularProducts();
      popularProducts.forEach((p: any) => {
        if (!finalIds.includes(p.id)) {
           finalIds.push(p.id);
        }
      });
    }

    // Lấy tối đa 8 sản phẩm
    const selectedIds = finalIds.slice(0, 8);
    
    // Guard: Prevent empty ID array querying which might be malformed
    if (selectedIds.length === 0) return [];

    // Lấy chi tiết thông tin sản phẩm
    const { data: recommendedData, error } = await supabase
      .from("products")
      .select(`
        *,
        product_discounts (
          id, discount_type, discount_value, is_active, start_date, end_date
        )
      `)
      .in("id", selectedIds)
      .eq("is_active", true);

    if (error) throw error;

    const processed = (recommendedData || []).map(calculateDiscountedPrice);
    
    // Xóa ngẫu nhiên để có tính mới mẻ khi gọi nhiều lần
    return processed.sort(() => Math.random() - 0.5);

  } catch (error) {
    console.error("Lỗi lấy sản phẩm Just For You:", error);
    // Fallback toàn bộ nếu lỗi
    return getPopularProducts();
  }
};


// Dịch tên màu sắc sang tiếng Việt
export const COLOR_TRANSLATIONS: Record<string, string> = {
  black: "Đen",
  white: "Trắng",
  red: "Đỏ",
  blue: "Xanh dương",
  green: "Xanh lá",
  yellow: "Vàng",
  pink: "Hồng",
  gray: "Xám",
  brown: "Nâu",
};

// Hàm lấy URL ảnh sản phẩm dựa trên màu sắc được chọn
export const getProductImageByColor = (product: any, color: string): string => {
  if (!product) return "https://via.placeholder.com/400";

  const selectedColor = color; // e.g: "White"

  // Tìm image_index trong JSON variants.options dựa trên color
  const colorOption = product.variants?.options?.find(
    (opt: any) => opt.color?.toLowerCase() === selectedColor?.toLowerCase(),
  );

  // Nếu tìm thấy màu thì lấy image_index, không thì mặc định là 0
  const targetIndex =
    colorOption?.image_index !== undefined ? colorOption.image_index : 0;

  // Lấy tên file ảnh từ mảng images theo index
  const imageName = product.images?.[targetIndex] || product.images?.[0];

  // Xử lý URL ảnh từ Supabase Storage
  let imageUrl = "https://via.placeholder.com/400";
  if (imageName) {
    imageUrl = imageName.startsWith("http")
      ? imageName
      : `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${imageName}`;
  }

  return imageUrl;
};

// Hàm tính toán giá đã giảm
export const calculateDiscountedPrice = (product: any) => {
  let finalPrice = product.price;
  let hasDiscount = false;

  // Đảm bảo lấy được mảng discounts (bây giờ là product_discounts)
  const discountsArray = Array.isArray(product.product_discounts)
    ? product.product_discounts
    : product.product_discounts
      ? [product.product_discounts]
      : [];

  // Tìm discount đang active
  const activeDiscountObj = discountsArray.find((d: any) => {
    if (!d) return false;

    const now = new Date();
    // Khắc phục lỗi parse ngày trên React Native (chuỗi từ Supabase có dấu cách thay vì chữ T)
    const safeStartDateStr = d.start_date ? d.start_date.replace(' ', 'T') : null;
    const safeEndDateStr = d.end_date ? d.end_date.replace(' ', 'T') : null;

    const startDate = safeStartDateStr ? new Date(safeStartDateStr) : new Date(0);
    const endDate = safeEndDateStr ? new Date(safeEndDateStr) : null;

    return d.is_active && startDate <= now && (!endDate || endDate >= now);
  });

  let discountBadgeText = null;

  if (activeDiscountObj) {
    hasDiscount = true;
    if (activeDiscountObj.discount_type === "percentage") {
      finalPrice = product.price - (product.price * activeDiscountObj.discount_value) / 100;
      discountBadgeText = `-${activeDiscountObj.discount_value}%`;
    } else {
      finalPrice = Math.max(0, product.price - activeDiscountObj.discount_value);
      discountBadgeText = `-${(activeDiscountObj.discount_value / 1000).toFixed(0)}k`;
    }
  }

  return {
    ...product,
    originalPrice: product.price,
    finalPrice: finalPrice,
    hasDiscount: hasDiscount,
    discountBadgeText: discountBadgeText,
  };
};
