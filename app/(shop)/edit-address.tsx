import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import CommonHeader from '@/src/components/layout/Header';
import { 
  ArrowLeft, Trash2, ChevronDown, Plus, Edit2, 
  CheckCircle2, Search, X 
} from 'lucide-react-native';
import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Address {
  id: string;
  receiver_name: string;
  phone_number: string;
  province_city: string;
  district: string;
  street_address: string;
  is_default: boolean;
  user_id: string;
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
  const [streetAddress, setStreetAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  
  // API Data State
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null);
  
  // Picker Modal State
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'province' | 'district'>('province');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAddresses();
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    try {
      const response = await fetch('https://provinces.open-api.vn/api/?depth=1');
      const data = await response.json();
      setProvinces(data);
    } catch (error) {
      console.error('Lỗi fetch tỉnh thành:', error);
    }
  };

  const fetchDistricts = async (provinceCode: number) => {
    try {
      const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
      const data = await response.json();
      setDistricts(data.districts || []);
    } catch (error) {
      console.error('Lỗi fetch quận huyện:', error);
    }
  };

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
    setStreetAddress('');
    setIsDefault(false);
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
    setIsDefault(address.is_default);
    
    // Tìm province code để load districts
    const province = provinces.find(p => p.name === address.province_city);
    if (province) {
      setSelectedProvinceCode(province.code);
      fetchDistricts(province.code);
    }
    
    setView('edit');
  };

  const handleProvinceSelect = (item: any) => {
    setProvinceCity(item.name);
    setSelectedProvinceCode(item.code);
    setDistrict(''); // Reset district when province changes
    fetchDistricts(item.code);
    setPickerVisible(false);
    setSearchQuery('');
  };

  const handleDistrictSelect = (item: any) => {
    setDistrict(item.name);
    setPickerVisible(false);
    setSearchQuery('');
  };

  const filteredData = useMemo(() => {
    const data = pickerType === 'province' ? provinces : districts;
    if (!searchQuery) return data;
    return data.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pickerType, provinces, districts, searchQuery]);

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

    if (!provinceCity.trim()) {
      newErrors.provinceCity = "Vui lòng chọn Tỉnh/Thành phố";
      valid = false;
    }

    if (!district.trim()) {
      newErrors.district = "Vui lòng chọn Quận/Huyện";
      valid = false;
    }

    if (!streetAddress.trim()) {
      newErrors.streetAddress = "Vui lòng nhập địa chỉ cụ thể";
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
        street_address: streetAddress,
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
        <Text style={styles.addressText}>{`${item.street_address}, ${item.district}, ${item.province_city}`}</Text>
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

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Tỉnh/Thành phố</Text>
                  <TouchableOpacity 
                    style={[styles.inputPicker, errors.provinceCity && styles.inputError]} 
                    onPress={() => {
                        setSearchQuery('');
                        setPickerType('province');
                        setPickerVisible(true);
                    }}
                  >
                    <Text style={provinceCity ? styles.pickerValue : styles.pickerPlaceholder} numberOfLines={1}>
                      {provinceCity || "Chọn tỉnh"}
                    </Text>
                    <ChevronDown size={18} color="#94A3B8" />
                  </TouchableOpacity>
                  {errors.provinceCity && <Text style={styles.errorText}>{errors.provinceCity}</Text>}
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Quận/Huyện</Text>
                  <TouchableOpacity 
                    style={[styles.inputPicker, errors.district && styles.inputError, !selectedProvinceCode && { opacity: 0.5 }]} 
                    disabled={!selectedProvinceCode}
                    onPress={() => {
                        setSearchQuery('');
                        setPickerType('district');
                        setPickerVisible(true);
                    }}
                  >
                    <Text style={district ? styles.pickerValue : styles.pickerPlaceholder} numberOfLines={1}>
                      {district || "Chọn quận"}
                    </Text>
                    <ChevronDown size={18} color="#94A3B8" />
                  </TouchableOpacity>
                  {errors.district && <Text style={styles.errorText}>{errors.district}</Text>}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Địa chỉ cụ thể</Text>
                <TextInput 
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }, errors.streetAddress && styles.inputError]}
                  placeholder="Số nhà, tên đường..."
                  value={streetAddress}
                  onChangeText={setStreetAddress}
                  multiline
                />
                {errors.streetAddress && <Text style={styles.errorText}>{errors.streetAddress}</Text>}
              </View>

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

      {/* API Picker Modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerType === 'province' ? 'Chọn Tỉnh/Thành phố' : 'Chọn Quận/Huyện'}
              </Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <X size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Search size={20} color="#94A3B8" />
              <TextInput
                 style={styles.searchInput}
                 placeholder="Tìm kiếm..."
                 value={searchQuery}
                 onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredData}
              keyExtractor={(item) => item.code.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.pickerItem} 
                  onPress={() => pickerType === 'province' ? handleProvinceSelect(item) : handleDistrictSelect(item)}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              initialNumToRender={15}
            />
          </View>
        </View>
      </Modal>
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
