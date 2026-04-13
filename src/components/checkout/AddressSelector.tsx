import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, ActivityIndicator, TextInput, TouchableOpacity } from "react-native";
import { ChevronDown, X, MapPin, Search } from "lucide-react-native";
import { 
  fetchProvinces, 
  fetchDistricts, 
  fetchWards, 
  GHNProvince, 
  GHNDistrict, 
  GHNWard 
} from "@/src/services/ghn/shippingService";

export interface Address {
  id?: string;
  receiver_name?: string;
  phone_number?: string;
  province_city?: string;
  district?: string;
  ward_commune?: string;
  street_address?: string;
  is_default?: boolean;
  ghn_district_id?: number | string;
  ghn_ward_code?: string | number;
}

interface Props {
  initialAddress?: Address | null;
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

  const [isMapping, setIsMapping] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  // Initialize from initialAddress
  useEffect(() => {
    const fetchAddressData = async () => {
      if (!initialAddress) return;
      
      setIsMapping(true);
      setMappingError(null);
      setStreet(initialAddress.street_address || "");
      
      // 1. Tỉnh/Thành
      if (!selectedProvince && initialAddress.province_city) {
        setSelectedProvince({ ProvinceID: 0, ProvinceName: initialAddress.province_city } as any);
      }
      
      // 2. Quận/Huyện
      if (!selectedDistrict && initialAddress.district && initialAddress.ghn_district_id) {
        setSelectedDistrict({ 
          DistrictID: Number(initialAddress.ghn_district_id), 
          ProvinceID: 0, 
          DistrictName: initialAddress.district 
        } as any);
      }
      
      // 3. Phường/Xã
      if (!selectedWard) {
        // Nếu DB có đủ tên Phường + Mã Phường
        if (initialAddress.ghn_ward_code && initialAddress.ward_commune) {
          setSelectedWard({ 
            WardCode: String(initialAddress.ghn_ward_code), 
            DistrictID: Number(initialAddress.ghn_district_id), 
            WardName: initialAddress.ward_commune 
          } as any);
        } 
        // Nếu DB chỉ có tên Phường (không có mã hoặc mã sai)
        else if (initialAddress.ward_commune && initialAddress.ghn_district_id) {
           try {
             const wardsList = await fetchWards(Number(initialAddress.ghn_district_id));
             const matchName = initialAddress.ward_commune.toLowerCase().replace(/phường|xã|thị trấn/g, "").trim();
             const matched = wardsList.find(w => w.WardName.toLowerCase().includes(matchName));
             
             if (matched) {
                console.log("[AddressSelector] Đã map được phường gốc:", matched.WardCode);
                setSelectedWard(matched);
             } else {
                setMappingError(`Không thể tự động khớp mã phường cho: ${initialAddress.ward_commune}. Vui lòng chọn lại.`);
                setSelectedWard({ 
                   WardCode: "", 
                   DistrictID: Number(initialAddress.ghn_district_id), 
                   WardName: initialAddress.ward_commune
                } as any);
             }
           } catch {
             setMappingError("Lỗi kết nối khi lấy danh sách Phường/Xã GHN.");
           }
        } 
        // Nếu DB có mã nhưng mất tên
        else if (initialAddress.ghn_ward_code) {
           setSelectedWard({ 
             WardCode: String(initialAddress.ghn_ward_code), 
             DistrictID: Number(initialAddress.ghn_district_id), 
             WardName: "Mặc định GHN" 
           } as any);
        }
      }
      setIsMapping(false);
    };

    fetchAddressData();
  }, [initialAddress]);

  // States of lists
  const [provinces, setProvinces] = useState<GHNProvince[]>([]);
  const [districts, setDistricts] = useState<GHNDistrict[]>([]);
  const [wards, setWards] = useState<GHNWard[]>([]);

  // Modal selector states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectionType, setSelectionType] = useState<"province" | "district" | "ward" | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Popup (Modal) tương ứng
  const openSelector = (type: "province" | "district" | "ward") => {
    if (type === "district" && (!selectedProvince || selectedProvince.ProvinceID === 0)) {
      return alert("Dữ liệu địa chỉ cũ cần được làm mới. Vui lòng chọn lại Tỉnh/Thành trước!");
    }
    if (type === "ward" && (!selectedDistrict || selectedDistrict.DistrictID === 0)) {
       return alert("Dữ liệu địa chỉ cũ cần được làm mới. Vui lòng chọn lại Quận/Huyện trước!");
    }
    setSearchQuery(""); // Reset search when opening
    setSelectionType(type);
    setModalVisible(true);
  };

  // Logic Render List vào Modal
  const renderList = () => {
    let dataList: any[] = [];
    if (selectionType === "province") dataList = provinces;
    else if (selectionType === "district") dataList = districts;
    else if (selectionType === "ward") dataList = wards;

    // Filter by search query
    const filteredData = dataList.filter((item) => {
      const name = (item.ProvinceName || item.DistrictName || item.WardName || "").toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });

    if (isLoadingList) {
      return (
        <View style={{ padding: 60, alignItems: "center" }}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 16, color: "#6B7280", fontSize: 15, fontWeight: "500" }}>Đang lấy dữ liệu từ GHN...</Text>
        </View>
      );
    }

    if (filteredData.length === 0 && searchQuery.length > 0) {
      return (
        <View style={{ padding: 40, alignItems: "center" }}>
          <MapPin size={48} color="#D1D5DB" />
          <Text style={{ marginTop: 16, color: "#9CA3AF", fontSize: 16, textAlign: "center" }}>
            Không tìm thấy kết quả cho "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredData}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyExtractor={(item, index) => {
          if (selectionType === "province") return String(item.ProvinceID || index);
          if (selectionType === "district") return String(item.DistrictID || index);
          if (selectionType === "ward") return String(item.WardCode || index);
          return String(index);
        }}
        renderItem={({ item }) => {
          const name = item.ProvinceName || item.DistrictName || item.WardName;
          const isSelected = 
            (selectionType === "province" && selectedProvince?.ProvinceID === item.ProvinceID) ||
            (selectionType === "district" && selectedDistrict?.DistrictID === item.DistrictID) ||
            (selectionType === "ward" && selectedWard?.WardCode === item.WardCode);

          return (
            <Pressable 
              onPress={() => handleSelectItem(item)}
              style={({ pressed }) => ({
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: isSelected ? "#EFF6FF" : pressed ? "#F9FAFB" : "transparent",
                marginBottom: 4,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <MapPin size={18} color={isSelected ? "#2563EB" : "#9CA3AF"} style={{ marginRight: 12 }} />
                <Text style={{ 
                  fontSize: 16, 
                  color: isSelected ? "#2563EB" : "#374151", 
                  fontWeight: isSelected ? "700" : "500",
                  flex: 1
                }}>
                  {name}
                </Text>
              </View>
              {isSelected && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563EB" }} />
              )}
            </Pressable>
          );
        }}
      />
    );
  };

  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#6B7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Thông tin địa chỉ
      </Text>

      <View style={{ 
        backgroundColor: "#F9FAFB", 
        borderRadius: 24, 
        padding: 12,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        gap: 8 
      }}>
        
        {/* Tỉnh / Thành phố */}
        <Pressable 
          onPress={() => openSelector("province")}
          style={({ pressed }) => ({ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center", 
            backgroundColor: pressed ? "#F3F4F6" : "white", 
            padding: 16, 
            borderRadius: 18,
            borderWidth: 1,
            borderColor: selectedProvince ? "#E5E7EB" : "#F3F4F6",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
              <MapPin size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "700", marginBottom: 2, textTransform: "uppercase" }}>Tỉnh / Thành phố</Text>
              <Text style={{ fontSize: 16, color: selectedProvince ? "#111827" : "#D1D5DB", fontWeight: "700" }} numberOfLines={1}>
                {selectedProvince ? selectedProvince.ProvinceName : "Bấm để chọn..."}
              </Text>
            </View>
          </View>
          <ChevronDown size={20} color="#9CA3AF" />
        </Pressable>

        {/* Quận / Huyện */}
        <Pressable 
          onPress={() => openSelector("district")}
          disabled={!selectedProvince}
          style={({ pressed }) => ({ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center", 
            backgroundColor: !selectedProvince ? "#F3F4F6" : pressed ? "#F3F4F6" : "white", 
            padding: 16, 
            borderRadius: 18,
            borderWidth: 1,
            borderColor: selectedDistrict ? "#E5E7EB" : "#F3F4F6",
            opacity: !selectedProvince ? 0.6 : 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#F5F3FF", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
              <MapPin size={20} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "700", marginBottom: 2, textTransform: "uppercase" }}>Quận / Huyện</Text>
              <Text style={{ fontSize: 16, color: selectedDistrict ? "#111827" : "#D1D5DB", fontWeight: "700" }} numberOfLines={1}>
                {selectedDistrict ? selectedDistrict.DistrictName : "Bấm để chọn..."}
              </Text>
            </View>
          </View>
          <ChevronDown size={20} color="#9CA3AF" />
        </Pressable>

        {/* Phường / Xã */}
        <Pressable 
          onPress={() => openSelector("ward")}
          disabled={!selectedDistrict || isMapping}
          style={({ pressed }) => ({ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center", 
            backgroundColor: !selectedDistrict ? "#F3F4F6" : pressed ? "#F3F4F6" : "white", 
            padding: 16, 
            borderRadius: 18,
            borderWidth: 1,
            borderColor: selectedWard ? "#E5E7EB" : "#F3F4F6",
            opacity: !selectedDistrict ? 0.6 : 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#ECFDF5", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
              {isMapping ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <MapPin size={20} color="#10B981" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "700", marginBottom: 2, textTransform: "uppercase" }}>Phường / Xã</Text>
              <Text style={{ fontSize: 16, color: selectedWard ? "#111827" : "#D1D5DB", fontWeight: "700" }} numberOfLines={1}>
                {selectedWard ? selectedWard.WardName : "Bấm để chọn..."}
              </Text>
            </View>
          </View>
          <ChevronDown size={20} color="#9CA3AF" />
        </Pressable>
        {mappingError && (
          <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4, marginLeft: 12, fontWeight: "600" }}>⚠️ {mappingError}</Text>
        )}

        {/* Số nhà, Tên đường */}
        <View style={{ 
          flexDirection: "row", 
          alignItems: "center",
          backgroundColor: "white", 
          padding: 16, 
          borderRadius: 18,
          borderWidth: 1,
          borderColor: street ? "#E5E7EB" : "#F3F4F6",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 3,
          elevation: 1
        }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF7ED", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
            <MapPin size={20} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "700", marginBottom: 2, textTransform: "uppercase" }}>Địa chỉ chi tiết</Text>
            <TextInput 
              value={street}
              onChangeText={setStreet}
              placeholder="Số nhà, tên đường..."
              placeholderTextColor="#D1D5DB"
              style={{ fontSize: 16, color: "#111827", fontWeight: "700", padding: 0 }}
            />
          </View>
        </View>

      </View>

      {/* Modal Chọn Item */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
          <View style={{ 
            backgroundColor: "white", 
            borderTopLeftRadius: 32, 
            borderTopRightRadius: 32, 
            height: "85%",
            paddingTop: 8
          }}>
             {/* Notch */}
             <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 12 }} />

             {/* Header Modal */}
             <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                   <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827" }}>
                     {selectionType === "province" ? "Chọn Tỉnh / Thành" : 
                      selectionType === "district" ? "Chọn Quận / Huyện" : "Chọn Phường / Xã"}
                   </Text>
                   <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 10, backgroundColor: "#F3F4F6", borderRadius: 24 }}>
                     <X size={20} color="#6B7280" />
                   </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  backgroundColor: "#F3F4F6", 
                  borderRadius: 18, 
                  paddingHorizontal: 16,
                  height: 56
                }}>
                  <Search size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
                  <TextInput 
                    placeholder={`Tìm ${selectionType === "province" ? "tỉnh thành" : selectionType === "district" ? "quận huyện" : "phường xã"}...`}
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{ flex: 1, fontSize: 16, color: "#111827", fontWeight: "600" }}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <X size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
             </View>

             {/* Danh sách List */}
             <View style={{ flex: 1, paddingHorizontal: 16 }}>
                {renderList()}
             </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}
