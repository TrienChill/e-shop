import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle2, 
  ShoppingBag,
  CreditCard,
  X
} from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import CommonHeader from '@/src/components/layout/Header';

interface PaymentMethod {
  id: string;
  card_holder: string;
  card_number: string;
  expiry_date: string;
  cvv: string;
  is_default: boolean;
  type: 'mastercard' | 'visa';
}

interface Transaction {
  id: string;
  order_id: string;
  amount: number;
  created_at: string;
  status: 'completed' | 'refunded';
}

const PaymentMethodsScreen = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Giả lập dữ liệu nếu chưa có bảng trong DB
      // Thực tế: const { data } = await supabase.from('payment_methods').select('*').eq('user_id', user.id);
      const mockCards: PaymentMethod[] = [
        {
          id: '1',
          card_holder: 'AMANDA MORGAN',
          card_number: '**** **** **** 1579',
          expiry_date: '12/22',
          cvv: '209',
          is_default: true,
          type: 'mastercard',
        },
        {
          id: '2',
          card_holder: 'AMANDA MORGAN',
          card_number: '**** **** **** 8842',
          expiry_date: '05/25',
          cvv: '112',
          is_default: false,
          type: 'visa',
        }
      ];

      const mockTransactions: Transaction[] = [
        { id: '1', order_id: '#92287157', amount: -500000, created_at: '2020-04-19T12:31:00Z', status: 'completed' },
        { id: '2', order_id: '#92287157', amount: -37000, created_at: '2020-04-19T12:31:00Z', status: 'refunded' },
        { id: '3', order_id: '#92287157', amount: -21000, created_at: '2020-04-19T12:31:00Z', status: 'completed' },
        { id: '4', order_id: '#92287157', amount: -75000, created_at: '2020-04-19T12:31:00Z', status: 'completed' },
        { id: '5', order_id: '#92287157', amount: -214000, created_at: '2020-04-19T12:31:00Z', status: 'completed' },
      ];

      setPaymentMethods(mockCards);
      setTransactions(mockTransactions);
    } catch (error) {
      console.error('Lỗi fetch dữ liệu thanh toán:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCard(null);
    setCardHolder('');
    setCardNumber('');
    setExpiryDate('');
    setCvv('');
    setModalVisible(true);
  };

  const openEditModal = (card: PaymentMethod) => {
    setEditingCard(card);
    setCardHolder(card.card_holder);
    setCardNumber(card.card_number);
    setExpiryDate(card.expiry_date);
    setCvv(card.cvv);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!cardHolder || !cardNumber || !expiryDate || !cvv) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin bắt buộc.");
      return;
    }

    setSaving(true);
    // Giả lập lưu
    setTimeout(() => {
      setSaving(false);
      setModalVisible(false);
      Alert.alert("Thành công", editingCard ? "Đã cập nhật thẻ." : "Đã thêm thẻ mới.");
    }, 1500);
  };

  const handleDelete = () => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa thẻ này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => setModalVisible(false) }
    ]);
  };

  const renderCard = ({ item }: { item: PaymentMethod }) => (
    <View style={styles.cardContainer}>
      <View style={[styles.bankCard, item.is_default && styles.defaultCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLogo}>
            {item.type === 'mastercard' ? (
               <View style={{ flexDirection: 'row' }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FF0000', opacity: 0.8 }} />
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFA500', marginLeft: -15, opacity: 0.8 }} />
               </View>
            ) : (
              <Text style={{ color: '#1A1F71', fontWeight: 'bold', fontStyle: 'italic', fontSize: 24 }}>VISA</Text>
            )}
          </View>
          <TouchableOpacity style={styles.cardSettingsBtn} onPress={() => openEditModal(item)}>
            <Settings size={16} color="#0055FF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardNumber}>{item.card_number}</Text>
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardLabel}>CARD HOLDER</Text>
            <Text style={styles.cardValue}>{item.card_holder}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardLabel}>VALID THRU</Text>
            <Text style={styles.cardValue}>{item.expiry_date}</Text>
          </View>
        </View>
        {item.is_default && (
           <View style={styles.activeBadge}>
             <CheckCircle2 size={12} color="#FFF" />
           </View>
        )}
      </View>
    </View>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={[styles.iconBox, item.status === 'refunded' ? styles.refundIcon : styles.completeIcon]}>
        <ShoppingBag size={20} color={item.status === 'refunded' ? '#FF4D4D' : '#0055FF'} />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTime}>{new Date(item.created_at).toLocaleDateString('vi-VN', { month: 'long', day: 'numeric', year: 'numeric' })} 12:31</Text>
        <Text style={styles.orderId}>Đơn hàng {item.order_id}</Text>
      </View>
      <Text style={[styles.amount, item.status === 'refunded' && styles.refundAmount]}>
        {item.amount.toLocaleString('vi-VN')}đ
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader
        renderLeft={() => (
          <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon}>
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
        )}
        title="Phương thức thanh toán"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Cài đặt</Text>
          <Text style={styles.subTitle}>Phương thức thanh toán</Text>
        </View>

        {/* Horizontal Payment Methods */}
        <View style={styles.methodsSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {paymentMethods.map((card) => (
              <React.Fragment key={card.id}>
                {renderCard({ item: card })}
              </React.Fragment>
            ))}
            
            {/* Add Card Button */}
            <TouchableOpacity style={styles.addCardBtn} onPress={openAddModal}>
              <View style={styles.plusCircle}>
                <Plus size={32} color="#FFF" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Transaction History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
          {loading ? (
             <ActivityIndicator size="large" color="#0055FF" style={{ marginTop: 20 }} />
          ) : (
            transactions.map((t) => (
              <React.Fragment key={t.id}>
                {renderTransaction({ item: t })}
              </React.Fragment>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{editingCard ? 'Chỉnh sửa thẻ' : 'Thêm thẻ mới'}</Text>
              <View style={{ flexDirection: 'row', gap: 15 }}>
                {editingCard && (
                  <TouchableOpacity onPress={handleDelete}>
                    <Trash2 size={24} color="#FF4D4D" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color="#0F172A" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên chủ thẻ</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Bắt buộc"
                  placeholderTextColor="#94A3B8"
                  value={cardHolder}
                  onChangeText={setCardHolder}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số thẻ</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Bắt buộc"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 15 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Ngày hết hạn</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/YY"
                    placeholderTextColor="#94A3B8"
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Mã CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="CVV"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={3}
                    value={cvv}
                    onChangeText={setCvv}
                  />
                </View>
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
          </KeyboardAvoidingView>
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
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  methodsSection: {
    marginTop: 30,
  },
  horizontalScroll: {
    paddingLeft: 24,
    paddingRight: 10,
    gap: 15,
  },
  cardContainer: {
    width: 300,
  },
  bankCard: {
    backgroundColor: '#F0F4FF',
    borderRadius: 20,
    padding: 24,
    height: 180,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  defaultCard: {
    borderColor: '#0055FF',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLogo: {
    height: 30,
    justifyContent: 'center',
  },
  cardSettingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumber: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1E293B',
    letterSpacing: 2,
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 2,
  },
  activeBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0055FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  addCardBtn: {
    width: 80,
    height: 180,
    backgroundColor: '#0055FF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusCircle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySection: {
    paddingHorizontal: 24,
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 20,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 15,
    marginBottom: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeIcon: {
    backgroundColor: '#EFF6FF',
  },
  refundIcon: {
    backgroundColor: '#FFF1F1',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  transactionTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  refundAmount: {
    color: '#FF4D4D',
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 15,
    fontSize: 16,
    color: '#0F172A',
  },
  saveBtn: {
    backgroundColor: '#0055FF',
    paddingVertical: 18,
    borderRadius: 50,
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PaymentMethodsScreen;
