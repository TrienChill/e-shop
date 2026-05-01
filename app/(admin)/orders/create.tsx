import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Search, Plus, Minus, Trash2, Check, ShoppingBag, Truck, ChevronDown } from "lucide-react-native";
import { supabase } from "@/src/lib/supabase";
import { fetchProvinces, fetchDistricts, fetchWards, calculateShippingFee } from "@/src/services/ghn/shippingService";

export default function CreateOrderScreen() {
  const router = useRouter();
  
  // Form State
  const [receiverName, setReceiverName] = useState("");
  const [phoneContact, setPhoneContact] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [shippingFee, setShippingFee] = useState("0");

  // GHN Address State
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  
  const [selectedProvince, setSelectedProvince] = useState<any>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);
  const [selectedWard, setSelectedWard] = useState<any>(null);

  // Dropdown UI State
  const [activeDropdown, setActiveDropdown] = useState<'province'|'district'|'ward'|null>(null);

  // Product Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cart State
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProvinces().then(data => setProvinces(data));
  }, []);

  useEffect(() => {
    if (selectedProvince) {
      fetchDistricts(selectedProvince.ProvinceID).then(data => {
        setDistricts(data);
        setSelectedDistrict(null);
        setSelectedWard(null);
        setWards([]);
      });
    }
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedDistrict) {
      fetchWards(selectedDistrict.DistrictID).then(data => {
        setWards(data);
        setSelectedWard(null);
      });
    }
  }, [selectedDistrict]);

  // Auto-calculate Shipping Fee
  useEffect(() => {
    const fetchFee = async () => {
      if (selectedDistrict && selectedWard) {
        // Calculate total weight (assuming 500g per item, min 500g)
        const totalWeight = selectedItems.length > 0 ? selectedItems.reduce((sum, item) => sum + (500 * item.quantity), 0) : 500;
        // Calculate insurance value (subtotal)
        const subtotalValue = selectedItems.length > 0 ? selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;

        try {
          const fee = await calculateShippingFee(
            { code: 'ghn', price: 30000 } as any, // Dummy method to force GHN API, fallback 30k
            {
              to_district_id: selectedDistrict.DistrictID,
              to_ward_code: selectedWard.WardCode,
              weight: totalWeight,
              insurance_value: subtotalValue
            }
          );
          setShippingFee(fee.toString());
        } catch (error) {
          console.error("Lỗi tính phí GHN:", error);
          setShippingFee("30000"); // Fallback
        }
      } else {
        setShippingFee("0");
      }
    };

    fetchFee();
  }, [selectedDistrict, selectedWard, selectedItems]);



  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        searchProducts(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchProducts = async (query: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, images, product_variants(id, size, color, stock)')
        .ilike('name', `%${query}%`)
        .limit(10);
      
      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error("Lỗi tìm kiếm sản phẩm:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddItem = (product: any, variant: any) => {
    // Check if stock is available
    if (variant && variant.stock <= 0) {
      alert("Sản phẩm này đã hết hàng!");
      return;
    }

    const newItem = {
      product_id: product.id,
      name: product.name,
      price: product.price,
      variant_id: variant ? variant.id : null,
      size: variant ? variant.size : null,
      color: variant ? variant.color : null,
      quantity: 1,
      max_stock: variant ? variant.stock : 999,
      image: product.images && product.images.length > 0 ? product.images[0] : null
    };

    setSelectedItems(prev => {
      // Check if already exists
      const existingIndex = prev.findIndex(item => 
        item.product_id === newItem.product_id && item.variant_id === newItem.variant_id
      );

      if (existingIndex >= 0) {
        const newItems = [...prev];
        if (newItems[existingIndex].quantity < newItems[existingIndex].max_stock) {
          newItems[existingIndex].quantity += 1;
        } else {
          alert("Vượt quá số lượng tồn kho!");
        }
        return newItems;
      }
      return [...prev, newItem];
    });
    
    // Clear search after adding
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQuantity = (index: number, delta: number) => {
    setSelectedItems(prev => {
      const newItems = [...prev];
      const newQuantity = newItems[index].quantity + delta;
      
      if (newQuantity <= 0) {
        newItems.splice(index, 1);
      } else if (newQuantity <= newItems[index].max_stock) {
        newItems[index].quantity = newQuantity;
      } else {
        alert("Vượt quá số lượng tồn kho!");
      }
      return newItems;
    });
  };

  const removeItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const fee = parseInt(shippingFee) || 0;
  const totalAmount = subtotal + fee;

  const handleSubmit = async () => {
    if (!receiverName.trim() || !phoneContact.trim() || !streetAddress.trim() || !selectedProvince || !selectedDistrict || !selectedWard) {
      alert("Vui lòng nhập đầy đủ thông tin khách hàng (Tên, SĐT, Tỉnh/Thành, Quận/Huyện, Phường/Xã, Số nhà)!");
      return;
    }

    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm!");
      return;
    }

    setIsSubmitting(true);
    try {
      const fullAddress = `${streetAddress}, ${selectedWard.WardName}, ${selectedDistrict.DistrictName}, ${selectedProvince.ProvinceName}`;
      
      // 1. Create Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          receiver_name: receiverName,
          phone_contact: phoneContact,
          shipping_address: fullAddress,
          shipping_district_id: selectedDistrict.DistrictID,
          shipping_ward_code: selectedWard.WardCode,
          payment_method: paymentMethod,
          shipping_fee: fee,
          total_amount: totalAmount,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;
      const orderId = orderData.id;

      // 2. Insert Order Items
      const orderItemsToInsert = selectedItems.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.price,
        selected_variant: item.variant_id ? { size: item.size, color: item.color } : null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (itemsError) throw itemsError;

      // 3. Update Stock (Optional, assuming you want this for true inventory management)
      for (const item of selectedItems) {
        if (item.variant_id) {
          const { error: stockError } = await supabase.rpc('decrement_stock', {
            v_id: item.variant_id,
            v_quantity: item.quantity
          });
          // If RPC doesn't exist, we can fallback to a direct update or ignore.
          // For safety, we'll just log stock reduction intent.
          if (stockError) console.warn("Could not reduce stock automatically:", stockError);
        }
      }

      alert("Tạo đơn hàng thành công!");
      router.push('/(admin)/orders');
    } catch (err: any) {
      alert("Lỗi khi tạo đơn hàng: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.push('/(admin)/orders')}>
          <ArrowLeft size={20} color="#4B5563" />
        </Pressable>
        <Text style={styles.title}>Tạo Đơn Hàng Mới</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.layout}>
          
          {/* LEFT COLUMN: Customer Info */}
          <View style={styles.leftColumn}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Truck size={20} color="#2563EB" />
                <Text style={styles.cardTitle}>Thông tin giao hàng</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tên người nhận <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: Nguyễn Văn A"
                  value={receiverName}
                  onChangeText={setReceiverName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Số điện thoại <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 0901234567"
                  keyboardType="phone-pad"
                  value={phoneContact}
                  onChangeText={setPhoneContact}
                />
              </View>

              <View style={[styles.formGroup, { zIndex: 3000 }]}>
                <Text style={styles.label}>Tỉnh/Thành phố <Text style={styles.required}>*</Text></Text>
                <View style={{ position: 'relative' }}>
                  <Pressable 
                    style={styles.dropdownSelector}
                    onPress={() => setActiveDropdown(activeDropdown === 'province' ? null : 'province')}
                  >
                    <Text style={selectedProvince ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
                      {selectedProvince ? selectedProvince.ProvinceName : "Chọn Tỉnh/Thành phố"}
                    </Text>
                    <ChevronDown size={16} color="#6B7280" />
                  </Pressable>
                  {activeDropdown === 'province' && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                        {provinces.map(prov => (
                          <Pressable 
                            key={prov.ProvinceID}
                            style={styles.dropdownMenuItem}
                            onPress={() => {
                              setSelectedProvince(prov);
                              setActiveDropdown(null);
                            }}
                          >
                            <Text style={styles.dropdownMenuItemText}>{prov.ProvinceName}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              <View style={[styles.formGroup, { zIndex: 2000 }]}>
                <Text style={styles.label}>Quận/Huyện <Text style={styles.required}>*</Text></Text>
                <View style={{ position: 'relative' }}>
                  <Pressable 
                    style={[styles.dropdownSelector, !selectedProvince && styles.dropdownDisabled]}
                    onPress={() => selectedProvince && setActiveDropdown(activeDropdown === 'district' ? null : 'district')}
                  >
                    <Text style={selectedDistrict ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
                      {selectedDistrict ? selectedDistrict.DistrictName : "Chọn Quận/Huyện"}
                    </Text>
                    <ChevronDown size={16} color="#6B7280" />
                  </Pressable>
                  {activeDropdown === 'district' && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                        {districts.map(dist => (
                          <Pressable 
                            key={dist.DistrictID}
                            style={styles.dropdownMenuItem}
                            onPress={() => {
                              setSelectedDistrict(dist);
                              setActiveDropdown(null);
                            }}
                          >
                            <Text style={styles.dropdownMenuItemText}>{dist.DistrictName}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              <View style={[styles.formGroup, { zIndex: 1000 }]}>
                <Text style={styles.label}>Phường/Xã <Text style={styles.required}>*</Text></Text>
                <View style={{ position: 'relative' }}>
                  <Pressable 
                    style={[styles.dropdownSelector, !selectedDistrict && styles.dropdownDisabled]}
                    onPress={() => selectedDistrict && setActiveDropdown(activeDropdown === 'ward' ? null : 'ward')}
                  >
                    <Text style={selectedWard ? styles.dropdownSelectedText : styles.dropdownPlaceholder}>
                      {selectedWard ? selectedWard.WardName : "Chọn Phường/Xã"}
                    </Text>
                    <ChevronDown size={16} color="#6B7280" />
                  </Pressable>
                  {activeDropdown === 'ward' && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                        {wards.map(ward => (
                          <Pressable 
                            key={ward.WardCode}
                            style={styles.dropdownMenuItem}
                            onPress={() => {
                              setSelectedWard(ward);
                              setActiveDropdown(null);
                            }}
                          >
                            <Text style={styles.dropdownMenuItemText}>{ward.WardName}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Số nhà, Đường <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 123 Lê Lợi"
                  value={streetAddress}
                  onChangeText={setStreetAddress}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phương thức thanh toán <Text style={styles.required}>*</Text></Text>
                <View style={styles.radioGroup}>
                  <Pressable 
                    style={[styles.radioItem, paymentMethod === 'COD' && styles.radioItemActive]}
                    onPress={() => setPaymentMethod('COD')}
                  >
                    <View style={[styles.radioCircle, paymentMethod === 'COD' && styles.radioCircleActive]}>
                      {paymentMethod === 'COD' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.radioText, paymentMethod === 'COD' && styles.radioTextActive]}>Thanh toán khi nhận hàng (COD)</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.radioItem, paymentMethod === 'Chuyển khoản' && styles.radioItemActive]}
                    onPress={() => setPaymentMethod('Chuyển khoản')}
                  >
                    <View style={[styles.radioCircle, paymentMethod === 'Chuyển khoản' && styles.radioCircleActive]}>
                      {paymentMethod === 'Chuyển khoản' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.radioText, paymentMethod === 'Chuyển khoản' && styles.radioTextActive]}>Chuyển khoản ngân hàng</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phí vận chuyển (GHN tự động tính)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#E5E7EB', color: '#6B7280' }]}
                  placeholder="0"
                  value={parseInt(shippingFee || "0").toLocaleString("vi-VN") + " ₫"}
                  editable={false}
                />
              </View>
            </View>
          </View>

          {/* RIGHT COLUMN: Products */}
          <View style={styles.rightColumn}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <ShoppingBag size={20} color="#2563EB" />
                <Text style={styles.cardTitle}>Sản phẩm đơn hàng</Text>
              </View>

              {/* Search Bar */}
              <View style={styles.searchBox}>
                <Search size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm sản phẩm để thêm..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {isSearching && <ActivityIndicator size="small" color="#2563EB" />}
              </View>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  <ScrollView nestedScrollEnabled={true}>
                    {searchResults.map((product) => (
                      <View key={product.id} style={styles.searchResultItem}>
                        <Text style={styles.productName}>{product.name} ({product.price.toLocaleString("vi-VN")}₫)</Text>
                        <View style={styles.variantsContainer}>
                          {product.product_variants && product.product_variants.length > 0 ? (
                            product.product_variants.map((v: any) => (
                              <Pressable 
                                key={v.id} 
                                style={styles.variantBtn}
                                onPress={() => handleAddItem(product, v)}
                              >
                                <Text style={styles.variantBtnText}>
                                  {v.color && v.size ? `${v.color} - ${v.size}` : v.color || v.size} (Tồn: {v.stock})
                                </Text>
                                <Plus size={12} color="#2563EB" />
                              </Pressable>
                            ))
                          ) : (
                            <Pressable 
                              style={styles.variantBtn}
                              onPress={() => handleAddItem(product, null)}
                            >
                              <Text style={styles.variantBtnText}>Thêm vào đơn</Text>
                              <Plus size={12} color="#2563EB" />
                            </Pressable>
                          )}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Selected Items */}
              <View style={styles.selectedItemsContainer}>
                <Text style={styles.sectionLabel}>Đã chọn ({selectedItems.length} sản phẩm)</Text>
                
                {selectedItems.length === 0 ? (
                  <View style={styles.emptyCart}>
                    <Text style={styles.emptyCartText}>Chưa có sản phẩm nào được chọn</Text>
                  </View>
                ) : (
                  selectedItems.map((item, index) => (
                    <View key={`${item.product_id}-${item.variant_id}`} style={styles.cartItem}>
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName}>{item.name}</Text>
                        {(item.color || item.size) && (
                          <Text style={styles.cartItemVariant}>Phân loại: {item.color} {item.size}</Text>
                        )}
                        <Text style={styles.cartItemPrice}>{item.price.toLocaleString("vi-VN")}₫</Text>
                      </View>
                      
                      <View style={styles.cartItemActions}>
                        <View style={styles.quantityControl}>
                          <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(index, -1)}>
                            <Minus size={14} color="#4B5563" />
                          </Pressable>
                          <Text style={styles.qtyText}>{item.quantity}</Text>
                          <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(index, 1)}>
                            <Plus size={14} color="#4B5563" />
                          </Pressable>
                        </View>
                        <Pressable style={styles.deleteBtn} onPress={() => removeItem(index)}>
                          <Trash2 size={16} color="#EF4444" />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Order Summary */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tạm tính:</Text>
                  <Text style={styles.summaryValue}>{subtotal.toLocaleString("vi-VN")}₫</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Phí giao hàng:</Text>
                  <Text style={styles.summaryValue}>{fee.toLocaleString("vi-VN")}₫</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={styles.summaryTotalLabel}>Tổng cộng:</Text>
                  <Text style={styles.summaryTotalValue}>{totalAmount.toLocaleString("vi-VN")}₫</Text>
                </View>

                <Pressable 
                  style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]} 
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Check size={20} color="white" />
                      <Text style={styles.submitBtnText}>Hoàn tất tạo đơn</Text>
                    </>
                  )}
                </Pressable>
              </View>

            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 16,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  scrollContent: {
    padding: 40,
  },
  layout: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 24,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      web: { boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" },
      default: { elevation: 2 }
    })
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#F9FAFB",
    ...(Platform.OS === 'web' && { outlineStyle: 'none' } as any),
  },
  dropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
  dropdownDisabled: {
    opacity: 0.5,
    backgroundColor: "#E5E7EB",
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  dropdownSelectedText: {
    fontSize: 14,
    color: "#1F2937",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginTop: 4,
    ...Platform.select({
      web: { boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" },
      default: { elevation: 5 }
    }),
  },
  dropdownMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownMenuItemText: {
    fontSize: 14,
    color: "#374151",
  },
  radioGroup: {
    gap: 12,
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  radioItemActive: {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#2563EB",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },
  radioText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  radioTextActive: {
    color: "#1E3A8A",
    fontWeight: "600",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    ...(Platform.OS === 'web' && { outlineStyle: 'none' } as any),
  },
  searchResults: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    maxHeight: 200,
    marginBottom: 24,
    overflow: "hidden",
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  variantsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  variantBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  variantBtnText: {
    fontSize: 12,
    color: "#1E3A8A",
    fontWeight: "500",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  selectedItemsContainer: {
    marginBottom: 24,
  },
  emptyCart: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyCartText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginBottom: 12,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  cartItemVariant: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
  },
  cartItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
  },
  qtyBtn: {
    padding: 8,
    backgroundColor: "#F9FAFB",
  },
  qtyText: {
    width: 30,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 6,
  },
  summaryContainer: {
    backgroundColor: "#F9FAFB",
    padding: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#4B5563",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 24,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2563EB",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
