import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import CommonHeader from '@/src/components/layout/Header';
import { 
  ArrowLeft, Trash2, ChevronDown, Plus, Edit2, 
  CheckCircle2, Search, X 
} from 'lucide-react-native';
import React, { useEffect, useState, useMemo } from 'react';
import { useSupabaseRealtime } from '@/src/services/useSupabaseRealtime';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddressSelector from "@/src/components/checkout/AddressSelector";

interface Address {
  id: string;
  receiver_name: string;
  phone_number: string;
  province_city: string;
  district: string;
  street_address: string;
  is_default: boolean;
  user_id: string;
  ward_commune?: string;
  ghn_district_id?: number | null;
  ghn_ward_code?: string | null;
}

const EditAddressScreen = () => {
  // Navigation State: 'list' | 'add' | 'edit'
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Form State
  const [receiverName, setReceiverName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provinceCity, setProvinceCity] = useState('');
  const [district, setDistrict] = useState('');
  const [wardCommune, setWardCommune] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [ghnDistrictId, setGhnDistrictId] = useState<number | null>(null);
  const [ghnWardCode, setGhnWardCode] = useState<string | null>(null);
  
  // CACHE TRÁNH INFINITE LOOP
  const [editingAddressCache, setEditingAddressCache] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- REALTIME HOOKS ---
  useSupabaseRealtime({
    table: 'user_addresses',
    onUpdate: () => fetchAddresses(),
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      setAddresses(data || []);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách địa chỉ:', error);
      Alert.alert("Lỗi", "Không thể tải danh sách địa chỉ.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setReceiverName('');
    setPhoneNumber('');
    setProvinceCity('');
    setDistrict('');
    setWardCommune('');
    setStreetAddress('');
    setIsDefault(false);
    setGhnDistrictId(null);
    setGhnWardCode(null);
    setEditingAddressCache(null);
    setErrors({});
    setSelectedAddressId(null);
  };

  const handleEditClick = (address: Address) => {
    setSelectedAddressId(address.id);
    setReceiverName(address.receiver_name);
    setPhoneNumber(address.phone_number);
    setProvinceCity(address.province_city);
    setDistrict(address.district);
    setStreetAddress(address.street_address);
    setWardCommune(address.ward_commune || '');
    setGhnDistrictId(address.ghn_district_id || null);
    setGhnWardCode(address.ghn_ward_code || null);
    setIsDefault(address.is_default);

    setEditingAddressCache({
        street_address: address.street_address,
        ward_commune: address.ward_commune || '',
        district: address.district,
        province_city: address.province_city,
        ghn_district_id: address.ghn_district_id || null,
        ghn_ward_code: address.ghn_ward_code || null
    });

    setView('edit');
  };

  const handleAddNew = () => {
    resetForm();
    setView('add');
  };

  const validate = () => {
    let valid = true;
    let newErrors: Record<string, string> = {};

    if (!receiverName.trim()) {
      newErrors.receiverName = "Vui lòng nhập họ tên người nhận";
      valid = false;
    }

    const phoneRegex = /^(0|84)(3|5|7|8|9)([0-9]{8})$/;
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Vui lòng nhập số điện thoại";
      valid = false;
    } else if (!phoneRegex.test(phoneNumber)) {
      newErrors.phoneNumber = "Số điện thoại không đúng định dạng VN";
      valid = false;
    }

    if (!provinceCity.trim() || !district.trim() || !wardCommune.trim() || !streetAddress.trim()) {
      newErrors.address = "Vui lòng hoàn thành đầy đủ thông tin địa chỉ";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Chưa đăng nhập.");

      const addressData = {
        receiver_name: receiverName,
        phone_number: phoneNumber,
        province_city: provinceCity,
        district: district,
        ward_commune: wardCommune,
        street_address: streetAddress,
        ghn_district_id: ghnDistrictId,
        ghn_ward_code: ghnWardCode,
        is_default: isDefault,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      // Nếu là đặt làm mặc định, phải unset các địa chỉ khác
      if (isDefault) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      if (view === 'edit' && selectedAddressId) {
        const { error } = await supabase
          .from('user_addresses')
          .update(addressData)
          .eq('id', selectedAddressId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_addresses')
          .insert([addressData]);
        if (error) throw error;
      }

      Alert.alert("Thành công", view === 'edit' ? "Đã cập nhật địa chỉ." : "Đã thêm địa chỉ mới.");
      setView('list');
      fetchAddresses();
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể lưu địa chỉ.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id?: string) => {
    const targetId = id || selectedAddressId;
    if (!targetId) return;

    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn xóa địa chỉ này không?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive", 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_addresses')
                .delete()
                .eq('id', targetId);
              if (error) throw error;
              if (view !== 'list') setView('list');
              fetchAddresses();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể xóa địa chỉ.");
            }
          } 
        }
      ]
    );
  };

  const renderAddressItem = ({ item }: { item: Address }) => (
    <View style={styles.addressCard}>
      <View style={styles.addressInfo}>
        <View style={styles.addressHeader}>
          <Text style={styles.addressName}>{item.receiver_name}</Text>
          {item.is_default && (
            <View style={styles.defaultBadge}>
              <CheckCircle2 size={12} color="#2563EB" />
              <Text style={styles.defaultLabel}>Mặc định</Text>
            </View>
          )}
        </View>
        <Text style={styles.addressPhone}>{item.phone_number}</Text>
        <Text style={styles.addressText}>{`${item.street_address}, ${item.ward_commune || ''}, ${item.district}, ${item.province_city}`}</Text>
      </View>
      <View style={styles.addressActions}>
        <TouchableOpacity onPress={() => handleEditClick(item)} style={styles.actionBtn}>
          <Edit2 size={18} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader
        renderLeft={() => (
          <TouchableOpacity 
            onPress={() => view === 'list' ? router.back() : setView('list')} 
            style={styles.iconBtn}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
        )}
        renderRight={() => view === 'list' ? (
          <TouchableOpacity onPress={handleAddNew} style={[styles.iconBtn, { backgroundColor: '#EFF6FF' }]}>
            <Plus size={22} color="#2563EB" />
          </TouchableOpacity>
        ) : view === 'edit' ? (
          <TouchableOpacity onPress={() => handleDelete()} style={[styles.iconBtn, { backgroundColor: '#FFF1F1' }]}>
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        ) : null}
      />

      {loading && view === 'list' ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0055FF" />
        </View>
      ) : view === 'list' ? (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 24, marginVertical: 24 }}>
            <Text style={styles.title}>Danh sách địa chỉ</Text>
          </View>
          <FlatList
            data={addresses}
            keyExtractor={(item) => item.id}
            renderItem={renderAddressItem}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Bạn chưa có địa chỉ nào.</Text>
                <TouchableOpacity onPress={handleAddNew} style={styles.emptyBtn}>
                  <Text style={styles.emptyBtnText}>Thêm ngay</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      ) : (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{view === 'edit' ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}</Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Họ và tên người nhận</Text>
                <TextInput 
                  style={[styles.input, errors.receiverName && styles.inputError]}
                  placeholder="Vd: Nguyễn Văn A"
                  value={receiverName}
                  onChangeText={setReceiverName}
                />
                {errors.receiverName && <Text style={styles.errorText}>{errors.receiverName}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput 
                  style={[styles.input, errors.phoneNumber && styles.inputError]}
                  placeholder="Vd: 0987654321"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                />
                {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
              </View>

              <AddressSelector 
                 initialAddress={editingAddressCache}
                 onLocationSelected={(province, district, ward, fullStr) => {
                     if (fullStr) {
                         setProvinceCity(fullStr.province);
                         setDistrict(fullStr.district);
                         setWardCommune(fullStr.ward);
                         setStreetAddress(fullStr.street);
                         setGhnDistrictId(district?.DistrictID || null);
                         setGhnWardCode(ward?.WardCode || null);
                     }
                 }}
              />
              {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Đặt làm địa chỉ mặc định</Text>
                <Switch 
                  value={isDefault}
                  onValueChange={setIsDefault}
                  trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                  thumbColor={isDefault ? '#2563EB' : '#94A3B8'}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.saveBtn} 
              activeOpacity={0.8} 
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}


    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  iconBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  addressCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  addressInfo: {
    flex: 1,
    marginRight: 10,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  addressName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  defaultLabel: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  addressPhone: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 16,
    marginBottom: 20,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  form: {
    gap: 20,
    marginTop: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 15,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputPicker: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pickerPlaceholder: {
    color: '#94A3B8',
    fontSize: 16,
  },
  pickerValue: {
    color: '#0F172A',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#FCA3A3',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginLeft: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
  },
  saveBtn: {
    backgroundColor: '#0055FF',
    paddingVertical: 18,
    borderRadius: 15,
    marginTop: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0055FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 15,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 10,
    fontSize: 16,
    color: '#0F172A',
  },
  pickerItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#334155',
  },
});

export default EditAddressScreen;
