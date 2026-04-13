import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ghnApi } from '@/src/services/ghn/shippingService';

interface ShippingOptionsProps {
  customerDistrictId: number | null;
  customerWardCode: string | null;
  totalCartWeight: number;
  onSelectMethod: (serviceId: number, fee: number) => void;
}

export default function ShippingOptions({
  customerDistrictId,
  customerWardCode,
  totalCartWeight,
  onSelectMethod
}: ShippingOptionsProps) {
  const [ghnServices, setGhnServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  useEffect(() => {
    // Chỉ gọi API khi khách đã có địa chỉ cụ thể
    if (!customerDistrictId || !customerWardCode) return;

    const fetchGHNFee = async () => {
      setLoading(true);
      try {
        // Tận dụng tính năng tự nhận diện Kho của GHN qua ShopId header trên endpoint fee
        // Không gọi available-services vì endpoint đó bắt buộc truyền from_district rất dễ gây lỗi 400 nếu truyền sai so với Dashboard.

        const servicesWithFee = [];

        // 1. Lấy phí Giao Chuẩn (service_type_id: 2)
        try {
          const standardFeeRes = await ghnApi.post('/shipping-order/fee', {
            service_type_id: 2, // Loại: Chuẩn
            to_district_id: customerDistrictId,
            to_ward_code: customerWardCode,
            weight: totalCartWeight,
            insurance_value: 0,
            coupon: null,
          });
          if (standardFeeRes.data.code === 200 && standardFeeRes.data.data) {
            servicesWithFee.push({
              service_id: 2, // Dùng tạm số 2 làm ID
              short_name: "Giao Hàng Chuẩn",
              fee: standardFeeRes.data.data.total
            });
          }
        } catch (err: any) {
             console.log("Không hỗ trợ giao chuẩn:", err.response?.data?.message || err.message);
        }

        // 2. Lấy phí Giao Nhanh / Tiết kiệm (service_type_id: 1)
        try {
          const fastFeeRes = await ghnApi.post('/shipping-order/fee', {
             service_type_id: 1, // Loại: Nhanh
             to_district_id: customerDistrictId,
             to_ward_code: customerWardCode,
             weight: totalCartWeight,
             insurance_value: 0,
             coupon: null,
          });
          if (fastFeeRes.data.code === 200 && fastFeeRes.data.data) {
             servicesWithFee.push({
                service_id: 1, // Dùng tạm số 1
                short_name: "Giao Hàng Nhanh",
                fee: fastFeeRes.data.data.total
             });
          }
        } catch (err: any) {
             // Thường GHN sẽ báo lỗi "Tuyến đường không hỗ trợ dịch vụ này"
             console.log("Không hỗ trợ giao nhanh:", err.response?.data?.message || err.message);
        }

        if (servicesWithFee.length > 0) {
          setGhnServices(servicesWithFee);
          setSelectedServiceId(servicesWithFee[0].service_id);
          onSelectMethod(servicesWithFee[0].service_id, servicesWithFee[0].fee);
        } else {
           throw new Error("Tuyến đường hoặc cấu hình Kho GHN hiện không khả dụng!");
        }

      } catch (error: any) {
        console.error("Lỗi tính phí GHN:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGHNFee();
  }, [customerDistrictId, customerWardCode, totalCartWeight]);

  if (!customerDistrictId) {
    return <Text style={{ color: 'gray', padding: 8 }}>Vui lòng chọn địa chỉ để tính phí vận chuyển.</Text>;
  }

  if (loading) {
    return (
      <View style={{ marginBottom: 24, padding: 16, backgroundColor: "#F9FAFB", borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
         <ActivityIndicator size="small" color="#0055FF" />
         <Text style={{ color: "#6B7280", fontStyle: "italic", fontSize: 13 }}>Đang tính toán phí giao hàng GHN...</Text>
      </View>
    );
  }

  return (
    <View>
      {ghnServices.map((service) => (
        <TouchableOpacity
          key={service.service_id}
          style={{
             flexDirection: "row",
             justifyContent: "space-between",
             alignItems: "center",
             borderWidth: 1, 
             borderColor: selectedServiceId === service.service_id ? '#0055FF' : '#E5E7EB',
             backgroundColor: selectedServiceId === service.service_id ? '#EFF6FF' : 'white',
             padding: 16, 
             borderRadius: 12, 
             marginBottom: 8
          }}
          onPress={() => {
            setSelectedServiceId(service.service_id);
            onSelectMethod(service.service_id, service.fee);
          }}
        >
          <Text style={{ fontWeight: 'bold', fontSize: 15, color: selectedServiceId === service.service_id ? "#1D4ED8" : "#374151" }}>
            {service.short_name}
          </Text>
          <Text style={{ fontWeight: '800', fontSize: 15, color: selectedServiceId === service.service_id ? "#2563EB" : "#111827" }}>
            {service.fee.toLocaleString('vi-VN')}₫
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
