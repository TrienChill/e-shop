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
  onLocationSelected: (
    province: GHNProvince | null,
    district: GHNDistrict | null,
    ward: GHNWard | null
  ) => void;
}

export default function AddressSelector({ onLocationSelected }: Props) {
  // States of selected items
  const [selectedProvince, setSelectedProvince] = useState<GHNProvince | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<GHNDistrict | null>(null);
  const [selectedWard, setSelectedWard] = useState<GHNWard | null>(null);

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

  // 2. Fetch Quận / Huyện khi đổi Tỉnh
  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedProvince) {
        setDistricts([]);
        return;
      }
      setIsLoadingList(true);
      const data = await fetchDistricts(selectedProvince.ProvinceID);
      setDistricts(data);
      setIsLoadingList(false);
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
      onLocationSelected(selectedProvince, selectedDistrict, selectedWard);
    }
  }, [selectedProvince, selectedDistrict, selectedWard]);

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
    if (type === "district" && !selectedProvince) return alert("Vui lòng chọn Tỉnh/Thành trước");
    if (type === "ward" && !selectedDistrict) return alert("Vui lòng chọn Quận/Huyện trước");
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
        keyExtractor={(item, index) => String(item.ProvinceID || item.DistrictID || item.WardCode || index)}
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
