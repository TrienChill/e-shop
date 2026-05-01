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

// Interfaces cho Dữ liệu địa chỉ GHN
export interface GHNProvince {
  ProvinceID: number;
  ProvinceName: string;
}

export interface GHNDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
}

export interface GHNWard {
  WardCode: string;
  DistrictID: number;
  WardName: string;
}

// 2. Cấu hình Axios trỏ thẳng tới Sandbox
export const ghnApi = axios.create({
  baseURL: "https://dev-online-gateway.ghn.vn/shiip/public-api/v2",
  headers: {
    "Content-Type": "application/json",
  },
});

// Sử dụng Interceptor để đảm bảo giá trị env luôn được nạp ở thời điểm tính toán (Dynamic Execution)
ghnApi.interceptors.request.use((config) => {
  const token = process.env.EXPO_PUBLIC_GHN_TOKEN;
  const shopId = process.env.EXPO_PUBLIC_GHN_SHOP_ID;

  if (token) {
    config.headers.set("Token", token);
  }
  // Bỏ qua ShopId đối với master-data (gây lỗi 400). Các API khác (fee, create_order) bắt buộc dùng ShopId
  if (shopId && config.url && !config.url.includes("master-data")) {
    config.headers.set("ShopId", shopId);
  }
  return config;
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
        // Bỏ các dòng Fix cứng điểm xuất phát đi vì lúc này GHN tự động quét ShopId
        // để lấy địa chỉ Shop (Thủ Dầu Một) mà bạn vừa khai báo.
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

// -------------------------------------------------------------
// HÀM LẤY MASTER DATA (Tỉnh/Thành, Quận/Huyện, Phường/Xã) GHN
// -------------------------------------------------------------
const MASTER_DATA_URL = "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data";

export const fetchProvinces = async (): Promise<GHNProvince[]> => {
  try {
    const res = await ghnApi.get<{ code: number; data: GHNProvince[] }>(`${MASTER_DATA_URL}/province`);
    if (res.data.code === 200) return res.data.data;
    return [];
  } catch (error) {
    console.error("Lỗi fetchProvinces GHN:", error);
    return [];
  }
};

export const fetchDistricts = async (provinceId: number): Promise<GHNDistrict[]> => {
  try {
    const res = await ghnApi.get<{ code: number; data: GHNDistrict[] }>(`${MASTER_DATA_URL}/district`, {
      params: { province_id: provinceId },
    });
    if (res.data.code === 200) return res.data.data;
    return [];
  } catch (error) {
    console.error("Lỗi fetchDistricts GHN:", error);
    return [];
  }
};

export const fetchWards = async (districtId: number): Promise<GHNWard[]> => {
  try {
    const res = await ghnApi.get<{ code: number; data: GHNWard[] }>(`${MASTER_DATA_URL}/ward`, {
      params: { district_id: districtId },
    });
    if (res.data.code === 200) return res.data.data;
    return [];
  } catch (error) {
    console.error("Lỗi fetchWards GHN:", error);
    return [];
  }
};

// -------------------------------------------------------------
// CREATE ORDER — Đẩy đơn hàng lên GHN để lấy mã vận đơn
// -------------------------------------------------------------

export interface GHNOrderItem {
  name: string;
  quantity: number;
  price: number;    // Đơn vị: VNĐ
  weight?: number;  // Đơn vị: gram (mặc định 500g)
}

export interface GHNCreateOrderRequest {
  to_name: string;
  to_phone: string;
  to_address: string;
  to_ward_code: string;
  to_district_id: number;
  weight: number;          // Tổng trọng lượng đơn hàng (gram)
  service_type_id: number; // 1: Nhanh, 2: Chuẩn
  payment_type_id: number; // 1: Shop trả phí, 2: Người nhận trả (COD)
  required_note: string;   // CHOTHUHANG | CHOXEMHANGKHONGTHU | KHONGCHOXEMHANG
  items: GHNOrderItem[];
  insurance_value?: number; // Giá trị bảo hiểm (VNĐ)
  cod_amount?: number;      // Tiền thu hộ COD (VNĐ)
}

export interface GHNCreateOrderResponse {
  code: number;
  message: string;
  data: {
    order_code: string;
    sort_code: string;
    trans_type: string;
    ward_encode: string;
    district_encode: string;
    expected_delivery_time: string;
    total_fee: number;
    fee: Record<string, number>;
  } | null;
}

/**
 * Tạo đơn hàng trên GHN và nhận mã vận đơn (Tracking Code).
 * Được gọi khi Admin nhấn "Duyệt" hoặc "Giao" trong trang Quản lý Đơn hàng.
 */
export const createGHNOrder = async (
  payload: GHNCreateOrderRequest
): Promise<GHNCreateOrderResponse["data"]> => {
  try {
    const response = await ghnApi.post<GHNCreateOrderResponse>(
      "/shipping-order/create",
      payload
    );

    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }

    throw new Error(`GHN API lỗi [${response.data.code}]: ${response.data.message}`);
  } catch (err: any) {
    // Extract GHN error message from Axios error response body
    if (err.response?.data) {
      const ghErr = err.response.data;
      throw new Error(
        `GHN API lỗi [${ghErr.code ?? err.response.status}]: ${ghErr.message ?? JSON.stringify(ghErr)}`
      );
    }
    throw err;
  }
};
