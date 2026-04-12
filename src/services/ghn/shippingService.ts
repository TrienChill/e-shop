import axios from "axios";

// 1. Interfaces
export interface GHNFeeRequest {
  to_district_id: number;
  to_ward_code: string;
  weight: number; // Đơn vị: gram (vd: 1000g)
  insurance_value?: number; // Giá trị hàng hóa để GHN đền bù
}

export interface GHNFeeResponse {
  code: number;
  message: string;
  data: {
    total: number;
    service_fee: number;
    // ... các phí phụ khác
  } | null;
}

export interface DBMethod {
  id: string;
  name: string;
  code: string; 
  price: number; 
  min_time: string;
  max_time: string;
  is_active: boolean;
}

// 2. Cấu hình Axios trỏ thẳng tới Sandbox
export const ghnApi = axios.create({
  baseURL: "https://dev-online-gateway.ghn.vn/shiip/public-api/v2",
  headers: {
    "Content-Type": "application/json",
    "Token": process.env.EXPO_PUBLIC_GHN_TOKEN || "", 
    "ShopId": process.env.EXPO_PUBLIC_GHN_SHOP_ID || "",
  },
});

/**
 * Hàm lấy phí vận chuyển tích hợp Fallback tĩnh
 */
export const calculateShippingFee = async (
  dbMethod: DBMethod,
  ghnPayload: GHNFeeRequest
): Promise<number> => {
  // Nếu phương thức là GHN hoặc Standard, tính qua API
  if (dbMethod.code?.toLowerCase() === "ghn" || dbMethod.code?.toLowerCase() === "standard") {
    try {
      const response = await ghnApi.post<GHNFeeResponse>("/shipping-order/fee", {
        service_type_id: 2, // 2: Chuẩn, 1: Nhanh/Bay
        from_district_id: 1442, // Fix cứng ID Quận của Shop xuất phát (Mặc định Quận 1 - 1442)
        to_district_id: ghnPayload.to_district_id,
        to_ward_code: ghnPayload.to_ward_code,
        weight: ghnPayload.weight,
        insurance_value: ghnPayload.insurance_value || 0,
        coupon: null,
      });

      if (response.data.code === 200 && response.data.data) {
        return response.data.data.total; // Trả về phí tính toán từ API thực tế
      }
    } catch (error) {
      console.warn("Lỗi API GHN, quay về giá cố định:", error);
    }
  }

  // Fallback: Sẽ rơi vào đây nếu lỗi API, cấu hình chưa đúng, hoặc Method là hỏa tốc
  return Number(dbMethod.price); 
};
