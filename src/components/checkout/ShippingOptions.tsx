import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { calculateShippingFee, GHNFeeRequest, DBMethod } from "@/src/services/ghn/shippingService";

interface Props {
  dbMethods: DBMethod[]; // Mảng phương thức lấy từ database
  customerDistrictId: number | null; 
  customerWardCode: string | null;
  totalCartWeight: number; // Tổng trọng lượng của giỏ hàng (grams)
  onSelectMethod: (method: DBMethod, fee: number) => void;
}

export default function ShippingOptions({ dbMethods, customerDistrictId, customerWardCode, totalCartWeight, onSelectMethod }: Props) {
  const [calculating, setCalculating] = useState(false);
  const [renderedMethods, setRenderedMethods] = useState<{method: DBMethod, fee: number}[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const loadRealtimeFees = async () => {
      if (!customerDistrictId || !customerWardCode) return; 
      
      setCalculating(true);
      const payload: GHNFeeRequest = {
         to_district_id: customerDistrictId,
         to_ward_code: customerWardCode,
         weight: totalCartWeight || 1000, 
      };

      const promises = dbMethods
        .filter(m => m.is_active)
        .map(async (method) => {
           const actualFee = await calculateShippingFee(method, payload);
           return { method, fee: actualFee };
        });

      const processedMethods = await Promise.all(promises);
      setRenderedMethods(processedMethods);
      
      // Auto-select 
      if (processedMethods.length > 0) {
        handleSelect(processedMethods[0].method, processedMethods[0].fee);
      }
      setCalculating(false);
    };

    loadRealtimeFees();
  }, [customerDistrictId, customerWardCode, totalCartWeight, dbMethods]);

  const handleSelect = (method: DBMethod, fee: number) => {
     setSelectedId(method.id);
     onSelectMethod(method, fee);
  }

  if (calculating) {
    return (
      <View style={{ marginBottom: 24, padding: 16, backgroundColor: "#F9FAFB", borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
         <ActivityIndicator size="small" color="#2563EB" />
         <Text style={{ color: "#6B7280", fontStyle: "italic", fontSize: 13 }}>Đang đo lường phí từ hệ thống GHN...</Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 16 }}>Phương Thức Giao Hàng</Text>
      
      {renderedMethods.map(({ method, fee }) => {
        const isSelected = selectedId === method.id;
        return (
          <Pressable 
            key={method.id} 
            onPress={() => handleSelect(method, fee)}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderWidth: 1,
              borderRadius: 12,
              marginBottom: 12,
              borderColor: isSelected ? "#3B82F6" : "#E5E7EB",
              backgroundColor: isSelected ? "#EFF6FF" : "white"
            }}
          >
             <View style={{ flex: 1 }}>
               <Text style={{ fontWeight: "700", fontSize: 15, color: isSelected ? "#1D4ED8" : "#374151" }}>
                 {method.name}
               </Text>
               <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
                 Thời gian nhận dự kiến: {method.min_time} - {method.max_time} ngày
               </Text>
             </View>
             <Text style={{ fontWeight: "800", fontSize: 15, color: isSelected ? "#2563EB" : "#111827" }}>
               {fee.toLocaleString("vi-VN")}₫
             </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
