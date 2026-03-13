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
          discounts (
            id, type, value, is_active, start_date, end_date
          )
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

// Lấy 10 sản phẩm mới nhất

export const getLatestProducts = async () => {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_discounts (
        discounts (*)
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
        discounts (*)
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
          discounts (*)
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

  // Đảm bảo lấy được mảng discounts, kể cả khi Supabase trả về object đơn lẻ hoặc undefined
  const discountsArray = Array.isArray(product.product_discounts)
    ? product.product_discounts
    : product.product_discounts
      ? [product.product_discounts]
      : [];

  // Tìm discount đang active
  const activeDiscountObj = discountsArray.find((pd: any) => {
    const d = pd.discounts;
    if (!d) return false;

    const now = new Date();
    const startDate = new Date(d.start_date);
    const endDate = d.end_date ? new Date(d.end_date) : null;

    return d.is_active && startDate <= now && (!endDate || endDate >= now);
  });

  const activeDiscount = activeDiscountObj?.discounts;

  if (activeDiscount) {
    hasDiscount = true;
    if (activeDiscount.type === "percentage") {
      finalPrice = product.price - (product.price * activeDiscount.value) / 100;
    } else {
      finalPrice = Math.max(0, product.price - activeDiscount.value);
    }
  }

  return {
    ...product,
    originalPrice: product.price,
    finalPrice: finalPrice,
    hasDiscount: hasDiscount,
  };
};
