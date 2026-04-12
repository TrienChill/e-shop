import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, ActivityIndicator, TextInput } from "react-native";
import { ChevronDown, X, MapPin } from "lucide-react-native";
import { 
  fetchProvinces, 
  fetchDistricts, 
  fetchWards, 
  GHNProvince, 
  GHNDistrict, 
  GHNWard 
} from "@/src/services/ghn/shippingService";

interface Props {
  initialAddress?: any;
  onLocationSelected: (
    province: GHNProvince | null,
    district: GHNDistrict | null,
    ward: GHNWard | null,
    fullAddressString?: { street: string; ward: string; district: string; province: string }
  ) => void;
}

export default function AddressSelector({ onLocationSelected, initialAddress }: Props) {
  // States of selected items
  const [selectedProvince, setSelectedProvince] = useState<GHNProvince | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<GHNDistrict | null>(null);
  const [selectedWard, setSelectedWard] = useState<GHNWard | null>(null);
  const [street, setStreet] = useState("");

  // Initialize from initialAddress
  useEffect(() => {
    if (initialAddress) {
       setStreet(initialAddress.street_address || "");
       
       if (!selectedProvince && initialAddress.province_city) {
         setSelectedProvince({ ProvinceID: 0, ProvinceName: initialAddress.province_city } as any);
       }
       
       // Chỉ set District và Ward mặc định nếu database đã có lưu sẵn mã ID GHN thật.
       // Nếu không có, bắt buộc người dùng chọn lại.
       if (!selectedDistrict && initialAddress.district && initialAddress.ghn_district_id) {
         setSelectedDistrict({ DistrictID: initialAddress.ghn_district_id, ProvinceID: 0, DistrictName: initialAddress.district } as any);
       }
       if (!selectedWard && initialAddress.ghn_ward_code) {
         setSelectedWard({ WardCode: initialAddress.ghn_ward_code, DistrictID: initialAddress.ghn_district_id, WardName: initialAddress.ward_commune || "Mặc định GHN" } as any);
       }
    }
  }, [initialAddress]);

  // States of lists
  const [provinces, setProvinces] = useState<GHNProvince[]>([]);
  const [districts, setDistricts] = useState<GHNDistrict[]>([]);
  const [wards, setWards] = useState<GHNWard[]>([]);

  // Modal selector states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectionType, setSelectionType] = useState<"province" | "district" | "ward" | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // 1. Fetch Tỉnh / Thành khi load component
  useEffect(() => {
    const loadProvinces = async () => {
      const data = await fetchProvinces();
      setProvinces(data);
    };
    loadProvinces();
  }, []);

  // Tự động phân tích và Mapping ProvinceID cho dữ liệu cũ (Dựa trên so sánh chuỗi)
  useEffect(() => {
    if (provinces.length > 0 && initialAddress?.province_city && selectedProvince?.ProvinceID === 0) {
      const matchName = initialAddress.province_city.toLowerCase().replace(/tỉnh|thành phố|tp\.?/g, "").trim();
      const matched = provinces.find(p => p.ProvinceName.toLowerCase().includes(matchName));
      if (matched) {
        setSelectedProvince(matched);
      }
    }
  }, [provinces, initialAddress]);

  // 2. Fetch Quận / Huyện khi đổi Tỉnh
  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedProvince) {
        setDistricts([]);
        return;
      }
      
      // LOG KIỂM TRA LỖI NHƯ YÊU CẦU: Ngăn API gọi tất cả 729 quận huyện nếu Tỉnh chưa có ID chuẩn
      if (selectedProvince.ProvinceID === 0) {
        console.warn("[AddressSelector Log] ProvinceID là 0 do dữ liệu cũ. Bỏ qua tải Quận/Huyện để tránh tải dữ liệu cả nước.");
        setDistricts([]);
        return;
      }

      setIsLoadingList(true);
      try {
        const data = await fetchDistricts(selectedProvince.ProvinceID);
        setDistricts(data);
      } catch (err) {
        console.error("[AddressSelector Log] Lỗi khi lấy danh sách Quận/Huyện:", err);
      } finally {
        setIsLoadingList(false);
      }
    };
    loadDistricts();
  }, [selectedProvince]);

  // 3. Fetch Phường / Xã khi đổi Quận
  useEffect(() => {
    const loadWards = async () => {
      if (!selectedDistrict) {
        setWards([]);
        return;
      }
      setIsLoadingList(true);
      const data = await fetchWards(selectedDistrict.DistrictID);
      setWards(data);
      setIsLoadingList(false);
    };
    loadWards();
  }, [selectedDistrict]);

  // Push back selected location info to Checkout Screen
  useEffect(() => {
    if (onLocationSelected) {
      onLocationSelected(
        selectedProvince, 
        selectedDistrict, 
        selectedWard,
        {
          street: street,
          ward: selectedWard?.WardName || initialAddress?.ward_commune || "",
          district: selectedDistrict?.DistrictName || initialAddress?.district || "",
          province: selectedProvince?.ProvinceName || initialAddress?.province_city || "",
        }
      );
    }
  }, [selectedProvince, selectedDistrict, selectedWard, street]);

  // Hành động khi nhấn chọn Item trong Modal
  const handleSelectItem = (item: any) => {
    if (selectionType === "province") {
      setSelectedProvince(item);
      setSelectedDistrict(null); // Reset cấp nhỏ hơn
      setSelectedWard(null);
    } else if (selectionType === "district") {
      setSelectedDistrict(item);
      setSelectedWard(null);
    } else if (selectionType === "ward") {
      setSelectedWard(item);
    }
    setModalVisible(false);
  };

  // Mở Popup (Modal) tương ứng
  const openSelector = (type: "province" | "district" | "ward") => {
    // Ràng buộc chọn tuần tự từ trên xuống dưới
    if (type === "district" && (!selectedProvince || selectedProvince.ProvinceID === 0)) {
      return alert("Dữ liệu địa chỉ cũ cần được làm mới. Vui lòng chọn lại Tỉnh/Thành trước!");
    }
    if (type === "ward" && (!selectedDistrict || selectedDistrict.DistrictID === 0)) {
       return alert("Dữ liệu địa chỉ cũ cần được làm mới. Vui lòng chọn lại Quận/Huyện trước!");
    }
    setSelectionType(type);
    setModalVisible(true);
  };

  // Logic Render List vào Modal
  const renderList = () => {
    let dataList: any[] = [];
    if (selectionType === "province") dataList = provinces;
    else if (selectionType === "district") dataList = districts;
    else if (selectionType === "ward") dataList = wards;

    if (isLoadingList) {
      return (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 12, color: "#6B7280" }}>Đang lấy dữ liệu từ GHN...</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={dataList}
        keyExtractor={(item, index) => {
          if (selectionType === "province") return String(item.ProvinceID);
          if (selectionType === "district") return String(item.DistrictID);
          if (selectionType === "ward") return String(item.WardCode);
          return String(index);
        }}
        renderItem={({ item }) => (
          <Pressable 
            onPress={() => handleSelectItem(item)}
            style={({ pressed }) => ({
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderColor: "#E5E7EB",
              backgroundColor: pressed ? "#F3F4F6" : "transparent"
            })}
          >
            <Text style={{ fontSize: 15, color: "#1F2937", fontWeight: "500" }}>
              {item.ProvinceName || item.DistrictName || item.WardName}
            </Text>
          </Pressable>
        )}
      />
    );
  };

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 16, fontWeight: "bold", color: "#111827", marginBottom: 12 }}>
        Địa chỉ giao hàng (Tính phí tự động)
      </Text>

      <View style={{ gap: 12, display: "flex", flexDirection: "column" }}>
        
        {/* Tỉnh / Thành phố */}
        <Pressable 
          onPress={() => openSelector("province")}
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "white", padding: 14, borderRadius: 12 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MapPin size={18} color="#6B7280" style={{ marginRight: 10 }}/>
            <Text style={{ fontSize: 15, color: selectedProvince ? "#111827" : "#9CA3AF" }}>
              {selectedProvince ? selectedProvince.ProvinceName : "1. Chọn Tỉnh / Thành phố"}
            </Text>
          </View>
          <ChevronDown size={20} color="#6B7280" />
        </Pressable>

        {/* Quận / Huyện */}
        <Pressable 
          onPress={() => openSelector("district")}
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: selectedProvince ? "#D1D5DB" : "#E5E7EB", backgroundColor: selectedProvince ? "white" : "#F9FAFB", padding: 14, borderRadius: 12 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
             <Text style={{ fontSize: 15, color: selectedDistrict ? "#111827" : "#9CA3AF", paddingLeft: 28 }}>
                {selectedDistrict ? selectedDistrict.DistrictName : "2. Chọn Quận / Huyện"}
             </Text>
          </View>
          <ChevronDown size={20} color="#6B7280" />
        </Pressable>

        {/* Phường / Xã */}
        <Pressable 
          onPress={() => openSelector("ward")}
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: selectedDistrict ? "#D1D5DB" : "#E5E7EB", backgroundColor: selectedDistrict ? "white" : "#F9FAFB", padding: 14, borderRadius: 12 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
             <Text style={{ fontSize: 15, color: selectedWard ? "#111827" : "#9CA3AF", paddingLeft: 28 }}>
                {selectedWard ? selectedWard.WardName : "3. Chọn Phường / Xã"}
             </Text>
          </View>
          <ChevronDown size={20} color="#6B7280" />
        </Pressable>

        {/* Số nhà, Tên đường */}
        <View style={{ borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "white", padding: 14, borderRadius: 12 }}>
          <TextInput 
            value={street}
            onChangeText={setStreet}
            placeholder="4. Số nhà, Tên đường..."
            placeholderTextColor="#9CA3AF"
            style={{ fontSize: 15, color: "#111827", padding: 0 }}
          />
        </View>

      </View>

      {/* Modal Chọn Item */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <View style={{ backgroundColor: "white", padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%" }}>
             {/* Header Modal */}
             <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                  {selectionType === "province" ? "Chọn Tỉnh / Thành" : 
                   selectionType === "district" ? "Chọn Quận / Huyện" : "Chọn Phường / Xã"}
                </Text>
                <Pressable onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                  <X size={24} color="#6B7280" />
                </Pressable>
             </View>

             {/* Danh sách List */}
             {renderList()}
          </View>
        </View>
      </Modal>

    </View>
  );
}
