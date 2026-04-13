import React from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  ActivityIndicator,
} from "react-native";
import { X as CloseIcon } from "lucide-react-native";
import AddressSelector from "./AddressSelector";
import { Address } from "./AddressSelector";

interface AddressEditModalProps {
  visible: boolean;
  onClose: () => void;
  addressData: any;
  setAddressData: (data: any) => void;
  handleSaveAddress: () => void;
  saving?: boolean;
}

export default function AddressEditModal({
  visible,
  onClose,
  addressData,
  setAddressData,
  handleSaveAddress,
  saving = false,
}: AddressEditModalProps) {
  const memoizedInitialAddress = React.useMemo(() => {
    if (!addressData.id && !addressData.city) return null; // New form
    return {
      street_address: addressData.street,
      ward_commune: addressData.ward,
      district: addressData.district,
      province_city: addressData.city,
      ghn_district_id: addressData.ghnDistrictId,
      ghn_ward_code: addressData.ghnWardCode,
    } as Address;
  }, [addressData.id, addressData.street, addressData.ward, addressData.district, addressData.city, addressData.ghnDistrictId, addressData.ghnWardCode]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <TouchableOpacity
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            padding: 20,
            maxHeight: "90%",
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}>
              {addressData.id ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <CloseIcon size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#6B7280", marginBottom: 8 }}>Họ tên</Text>
              <TextInput
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#111827",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
                value={addressData.name}
                onChangeText={(t) => setAddressData({ ...addressData, name: t })}
                placeholder="Nhập họ tên"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#6B7280", marginBottom: 8 }}>Số điện thoại</Text>
              <TextInput
                style={{
                  backgroundColor: "#F3F4F6",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: "#111827",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
                value={addressData.phone}
                onChangeText={(t) => setAddressData({ ...addressData, phone: t })}
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
              />
            </View>

            <AddressSelector
              initialAddress={memoizedInitialAddress}
              onLocationSelected={(province, district, ward, fullStr) => {
                if (fullStr) {
                  setAddressData((prev: any) => ({
                    ...prev,
                    city: fullStr.province,
                    district: fullStr.district,
                    ward: fullStr.ward,
                    street: fullStr.street,
                    ghnDistrictId: district?.DistrictID || null,
                    ghnWardCode: ward?.WardCode || null,
                  }));
                }
              }}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingVertical: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>Đặt làm địa chỉ mặc định</Text>
              <Switch
                value={addressData.isDefault}
                onValueChange={(v) => setAddressData({ ...addressData, isDefault: v })}
                trackColor={{ false: "#D1D5DB", true: "#2563EB" }}
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: saving ? "#9CA3AF" : "#111827",
                borderRadius: 15,
                paddingVertical: 16,
                alignItems: "center",
                marginBottom: 10,
              }}
              onPress={handleSaveAddress}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Lưu địa chỉ</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
