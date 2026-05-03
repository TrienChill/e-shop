import { supabase, supabaseAdmin } from "@/src/lib/supabase";
import { createGHNOrder, fetchProvinces, fetchDistricts, fetchWards } from "@/src/services/ghn/shippingService";

export type AdminOrder = {
  id: string;
  status: string;
  total_amount: number | null;
  created_at: string;
  user_id?: string;
  receiver_name?: string;
  phone_contact?: string;
  shipping_address?: string;
  shipping_fee?: number;
  ghn_order_code?: string | null;
};

export async function listOrders(params?: {
  limit?: number;
  status?: string;
}) {
  const limit = params?.limit ?? 50;

  let q = supabase
    .from("orders")
    .select(`
      id,
      status,
      total_amount,
      created_at,
      user_id,
      receiver_name,
      phone_contact,
      shipping_address,
      shipping_fee,
      payment_method,
      ghn_order_code,
      address_id,
      shipping_district_id,
      shipping_ward_code,
      user_addresses (
        ghn_district_id,
        ghn_ward_code
      ),
      order_items (
        id,
        quantity,
        price_at_purchase,
        selected_variant,
        products (
          id,
          name
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params?.status) q = q.eq("status", params.status);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function getOrderDetails(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        products (name, images)
      ),
      profiles (*),
      user_addresses (
        ghn_district_id,
        ghn_ward_code,
        province_city,
        district,
        ward_commune,
        street_address
      )
    `)
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { error } = await supabase
    .from("orders")
    .update({
      status,
      ...(status === "completed"  ? { completed_at:  new Date().toISOString() } : {}),
      ...(status === "shipping"   ? { shipping_at:   new Date().toISOString() } : {}),
      ...(status === "processing" ? { processing_at: new Date().toISOString() } : {}),
      ...(status === "cancelled"  ? { cancelled_at:  new Date().toISOString() } : {}),
    })
    .eq("id", orderId);

  if (error) throw error;
}

export async function pushOrderToGHN(order: any): Promise<string> {
  // --- Ưu tiên 1: Đọc snapshot từ chính đơn hàng ---
  let districtId: number | null = order.shipping_district_id
    ? Number(order.shipping_district_id)
    : null;
  let wardCode: string | null = order.shipping_ward_code
    ? String(order.shipping_ward_code)
    : null;

  // --- Ưu tiên 2: Fallback sang user_addresses relation ---
  if (!districtId || !wardCode) {
    let addr = order.user_addresses;
    if (addr && Array.isArray(addr) && addr.length > 0) addr = addr[0];
    if (addr?.ghn_district_id) districtId = Number(addr.ghn_district_id);
    if (addr?.ghn_ward_code)   wardCode   = String(addr.ghn_ward_code);
  }

  // --- Ưu tiên 3: Auto-map cho các đơn cũ chưa có DB ---
  if (!districtId || !wardCode) {
    const textAddr = order.full_shipping_address || order.shipping_address || "";
    if (textAddr) {
      try {
        const parts = textAddr.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const provName = parts[parts.length - 1]; // vd: "Tp. Hồ Chí Minh"
          const distName = parts[parts.length - 2]; // vd: "Quận 3"
          const wardName = parts.length >= 3 ? parts[parts.length - 3] : null;

          const provinces = await fetchProvinces();
          const normProv = provName.toLowerCase().replace(/tỉnh|thành phố|tp\.?|hồ chí minh|hcm/g, "").trim();
          const p = provinces.find(x => 
            x.ProvinceName.toLowerCase().includes(normProv) || 
            (normProv === "hcm" && x.ProvinceName.toLowerCase().includes("hồ chí minh")) ||
            (normProv === "" && provName.toLowerCase().includes("hồ chí minh"))
          );

          if (p) {
            const districts = await fetchDistricts(p.ProvinceID);
            const normDist = distName.toLowerCase().replace(/quận|huyện|thị xã|thành phố/g, "").trim();
            const d = districts.find(x => x.DistrictName.toLowerCase().includes(normDist));
            
            if (d) {
              districtId = d.DistrictID;
              const wards = await fetchWards(d.DistrictID);
              if (wards.length > 0) {
                if (wardName) {
                  const normWard = wardName.toLowerCase().replace(/phường|xã|thị trấn/g, "").trim();
                  const w = wards.find(x => x.WardName.toLowerCase().includes(normWard));
                  wardCode = w ? w.WardCode : wards[0].WardCode; // Có fallback
                } else {
                  wardCode = wards[0].WardCode;
                }
              }

              // Update snapshot để lần sau không cần map lại
              if (districtId && wardCode) {
                await supabase.from("orders").update({
                  shipping_district_id: districtId,
                  shipping_ward_code: wardCode
                }).eq("id", order.id);
              }
            }
          }
        }
      } catch (err) {
        console.log("Lỗi auto-map địa chỉ:", err);
      }
    }
  }

  // --- Kiểm tra: Vẫn không có mã → báo lỗi rõ ràng ---
  if (!districtId || !wardCode) {
    throw new Error(
      "Địa chỉ giao hàng chưa có mã GHN (district_id / ward_code). Dù hệ thống đã cố gắng tìm kiếm tự động nhưng từ khóa địa chỉ (Tỉnh/Quận) không khớp."
    );
  }

  // --- Chuẩn bị danh sách sản phẩm ---
  const items = (order.order_items && order.order_items.length > 0)
    ? order.order_items.map((item: any) => ({
        name:     item.products?.name ?? "Sản phẩm",
        quantity: item.quantity || 1,
        price:    Math.round(item.price_at_purchase ?? 0),
        weight:   500, // Mặc định 500g/item
      }))
    : [
        {
          name: "Sản phẩm E-Shop (Không xác định)",
          quantity: 1,
          price: Math.round(order.total_amount ?? 0),
          weight: 500,
        }
      ];

  // Tổng trọng lượng: 500g × mỗi item × số lượng, tối thiểu 1g
  const totalWeight = Math.max(
    items.reduce((sum: number, item: any) => sum + item.weight * item.quantity, 0),
    1
  );

  // --- Gọi GHN Create Order API ---
  const ghnPayload = {
    to_name:        (order.receiver_name ?? "Kh\u00e1ch h\u00e0ng").trim(),
    to_phone:       (order.phone_contact ?? "").trim().replace(/\s+/g, ""),
    to_address:     (order.shipping_address ?? "Kh\u00f4ng c\u00f3 ?a ch\u1ec9").trim(),
    to_ward_code:   wardCode,
    to_district_id: districtId,
    weight:         totalWeight,
    service_type_id: 2,
    payment_type_id: 1,
    required_note:  "CHOTHUHANG",
    cod_amount:     order.payment_method?.toLowerCase() === 'cod'
      ? Math.round(order.total_amount ?? 0)
      : 0,
    insurance_value: Math.round(order.total_amount ?? 0),
    items,
  };

  // Validation tr\u01b0\u1edbc khi g\u1ecdi API
  if (!ghnPayload.to_phone || ghnPayload.to_phone.length < 9) {
    throw new Error(`S\u1ed1 \u0111i\u1ec7n tho\u1ea1i ng\u01b0\u1eddi nh\u1eadn kh\u00f4ng h\u1ee3p l\u1ec7: "${ghnPayload.to_phone}". Vui l\u00f2ng c\u1eadp nh\u1eadt \u0111\u01a1n h\u00e0ng.`);
  }
  if (!ghnPayload.to_address || ghnPayload.to_address.length < 5) {
    throw new Error(`\u0110\u1ecba ch\u1ec9 giao h\u00e0ng kh\u00f4ng h\u1ee3p l\u1ec7: "${ghnPayload.to_address}".`);
  }

  console.log("[GHN] Payload g\u1eedi l\u00ean:", JSON.stringify(ghnPayload, null, 2));

  const ghnData = await createGHNOrder(ghnPayload);

  if (!ghnData?.order_code) {
    throw new Error("GHN không trả về mã vận đơn. Vui lòng thử lại.");
  }

  // --- Lưu mã vận đơn vào DB ---
  const { error: updateErr } = await supabase
    .from("orders")
    .update({
      ghn_order_code: ghnData.order_code,
      ghn_sort_code:  ghnData.sort_code ?? null,
    })
    .eq("id", order.id);

  if (updateErr) throw updateErr;

  return ghnData.order_code;
}

export async function deleteOrders(orderIds: string[]) {
  const client = supabaseAdmin ?? supabase;

  // Must delete child records first due to FK constraint
  const { error: itemsError } = await client
    .from("order_items")
    .delete()
    .in("order_id", orderIds);

  if (itemsError) throw itemsError;

  const { error } = await client
    .from("orders")
    .delete()
    .in("id", orderIds);

  if (error) throw error;
}
