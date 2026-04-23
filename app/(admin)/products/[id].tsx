import { supabase } from "@/src/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { ArrowLeft, ChevronDown, Image as ImageIcon, Plus, Save, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchAllCategories, CategoryNode } from "@/src/utils/categoryTree";

// Type definitions
interface ProductImage {
  id?: string;
  url: string;
  variant_id?: string | null;
  colorKey?: string; // <--- THÊM DÒNG NÀY: Dùng để map ảnh với màu sắc
  image_type: 'general' | 'variant' | 'description';
  is_thumbnail: boolean;
  display_order: number;
  localUri?: string; // For new ones
}

export default function ProductEditorScreen() {
  const { id } = useLocalSearchParams();
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Form State Cơ bản
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [specifications, setSpecifications] = useState<{ name: string; value: string }[]>([]);
  const [newSpecName, setNewSpecName] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);

  // Category State
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Variant State
  const [variants, setVariants] = useState<any[]>([]);
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newPrice, setNewPrice] = useState(""); // Để trống sẽ dùng giá mặc định

  const navigation = useNavigation();

  // --- LOGIC CHỐNG THOÁT KHI CHƯA LƯU ---
  const [initialDataStr, setInitialDataStr] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Tạo snapshot chuỗi dữ liệu hiện tại để so sánh
  const currentDataStr = React.useMemo(() => JSON.stringify({
    name, price, shortDescription, description, specifications, variants, selectedCategoryId,
    productImages: productImages.map(Math.random) // Cách ngẫu nhiên ngắn gọn để chỉ định hình ảnh đã thay đổi
  }), [name, price, shortDescription, description, specifications, variants, productImages, selectedCategoryId]);

  // Khởi tạo trạng thái ban đầu của sản phẩm
  useEffect(() => {
    if (!loading) {
      if (!initialDataStr) {
        setInitialDataStr(currentDataStr);
      } else if (currentDataStr !== initialDataStr) {
        setHasUnsavedChanges(true); // Nếu khác ban đầu -> Đánh dấu là chưa lưu
      } else {
        setHasUnsavedChanges(false);
      }
    }
  }, [loading, currentDataStr, initialDataStr]);

  // Hook 1: Chặn nút Back của UI, nút Back của trình duyệt (SPA mode), và nút Back điện thoại
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Nếu không có thay đổi, cho phép thoát bình thường
      if (!hasUnsavedChanges) return;

      // Còn nếu có thay đổi, ngăn chặn hành động thoát
      e.preventDefault();

      if (Platform.OS === 'web') {
        // Trên web, window.confirm sẽ chặn luồng xử lý đồng bộ
        const ok = window.confirm("Bạn có thay đổi nội dung trang này nhưng chưa được lưu. Thao tác tiếp tục sẽ làm mất những thay đổi đó.\n\nBạn có chắc chắn muốn thoát?");
        if (ok) {
          // Bắt buộc phải tắt cờ trước và dùng setTimeout để đẩy việc dispatch vào hàng đợi sau khi luồng hiện tại kết thúc
          setHasUnsavedChanges(false);
          setTimeout(() => {
            navigation.dispatch(e.data.action);
          }, 0);
        }
      } else {
        Alert.alert(
          "Cảnh báo",
          "Bạn có thay đổi nội dung trang này nhưng chưa được lưu.\nThao tác tiếp tục sẽ làm mất những thay đổi đó.\nBạn có chắc chắn muốn thoát khỏi đây?",
          [
            { text: "Ở lại", style: 'cancel', onPress: () => {} },
            {
              text: "Thoát",
              style: 'destructive',
              onPress: () => {
                setHasUnsavedChanges(false);
                setTimeout(() => {
                  navigation.dispatch(e.data.action);
                }, 0);
              },
            },
          ]
        );
      }
    });

    return unsubscribe;
  }, [hasUnsavedChanges, navigation]);

  // Hàm xử lý riêng cho nút Back tự thiết kế trên ứng dụng/giao diện web
  const handleCustomUiBack = () => {
    if (hasUnsavedChanges) {
      if (Platform.OS === 'web') {
        const ok = window.confirm("Bạn có thay đổi nội dung trang này nhưng chưa được lưu. Thao tác tiếp tục sẽ làm mất những thay đổi đó.\n\nBạn có chắc chắn muốn thoát?");
        if (ok) {
          setHasUnsavedChanges(false);
          setTimeout(() => router.back(), 0);
        }
      } else {
        Alert.alert(
          "Cảnh báo",
          "Bạn có thay đổi nội dung trang này nhưng chưa được lưu.\nThao tác tiếp tục sẽ làm mất những thay đổi đó.\nBạn có chắc chắn muốn thoát khỏi đây?",
          [
            { text: "Ở lại", style: 'cancel' },
            {
              text: "Thoát",
              style: 'destructive',
              onPress: () => {
                setHasUnsavedChanges(false);
                setTimeout(() => router.back(), 0);
              },
            },
          ]
        );
      }
    } else {
      router.back();
    }
  };

  // Hook 2: Chặn hành động tải lại trang (F5) hoặc đóng Tab trên nền web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Yêu cầu browser hiển thị prompt chuẩn
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // --- THÊM LOGIC GOM NHÓM BIẾN THỂ THEO MÀU ---
  // Tự động phân loại danh sách variants thành các nhóm theo màu sắc
  const groupedVariants = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    variants.forEach(v => {
      const colorKey = v.color || "Không phân màu";
      if (!groups[colorKey]) groups[colorKey] = [];
      groups[colorKey].push(v);
    });
    return groups;
  }, [variants]);

  // Load categories
  const loadCategories = React.useCallback(async () => {
    try {
      const data = await fetchAllCategories();
      const { buildTree } = await import("@/src/utils/categoryTree");
      setCategories(buildTree(data));
    } catch (err) {
      console.error("Lỗi tải danh mục:", err);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Flatten categories for display
  const flatCategories = React.useMemo(() => {
    const result: CategoryNode[] = [];
    const flatten = (nodes: CategoryNode[]) => {
      for (const node of nodes) {
        result.push(node);
        if (node.children.length > 0) flatten(node.children);
      }
    };
    flatten(categories);
    return result;
  }, [categories]);

  // Get selected category name
  const selectedCategoryName = React.useMemo(() => {
    if (!selectedCategoryId) return null;
    const cat = flatCategories.find(c => c.id === selectedCategoryId);
    return cat ? cat.name_vi || cat.name : null;
  }, [selectedCategoryId, flatCategories]);

  // Hàm lấy ảnh mô tả cho một màu sắc cụ thể
  const getImageForColor = (color: string) => {
    return productImages.find(img => 
      img.image_type === 'variant' && 
      (img.colorKey === color || (img.variant_id && (variants.find(v => v.id === img.variant_id)?.color || "Không phân màu") === color))
    );
  };

  // Fetch dữ liệu nếu là Edit Mode
  useEffect(() => {
    if (!isNew) {
      fetchProductDetail();
    }
  }, [id]);

  const fetchProductDetail = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setName(data.name);
      setPrice(String(data.price));
      setDescription(data.description || "");
      setShortDescription(data.short_description || "");
      setSpecifications(data.specifications || []);
      setSelectedCategoryId(data.category_id || null);

      // Fetch Images from product_images table
      fetchProductImages(data.id);

      // Fetch Variants
      fetchVariants(data.id);
    }
    setLoading(false);
  };

  const fetchProductImages = async (productId: string) => {
    const { data, error } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("display_order", { ascending: true });

    if (data) {
      setProductImages(data as ProductImage[]);
    }
  };

  const fetchVariants = async (productId: string) => {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId);
    if (data) setVariants(data);
  };

  // Hàm chọn ảnh
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Bạn cần cấp quyền truy cập thư viện ảnh!");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      const newImages: ProductImage[] = result.assets.map(asset => ({
        localUri: asset.uri,
        url: "", // Will be filled after upload
        image_type: 'general',
        is_thumbnail: productImages.length === 0, // Default first image as thumbnail
        display_order: productImages.length,
      }));
      setProductImages([...productImages, ...newImages]);
    }
  };

  // Hàm upload ảnh lên Supabase Storage
  const uploadImageToStorage = async (uri: string): Promise<string | null> => {
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();

      // --- ĐOẠN ĐÃ ĐƯỢC FIX LỖI BLOB LINK ---
      // 1. Cố gắng lấy định dạng chuẩn từ thuộc tính type của file Blob (VD: 'image/jpeg')
      const mimeType = blob.type || 'image/jpeg';

      // 2. Tách đuôi file từ chuỗi MIME type (VD: lấy 'jpeg' từ 'image/jpeg')
      const safeExtension = mimeType.split('/')[1] || 'jpeg';

      // 3. Tạo tên file mới hoàn toàn độc lập, không phụ thuộc vào tên file gốc
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${safeExtension}`;
      const filePath = `products/${fileName}`;
      // -------------------------------------

      const { data, error } = await supabase.storage
        .from("avatars") // Bạn đang dùng bucket 'avatars'
        .upload(filePath, blob, {
          contentType: mimeType, // Truyền MIME type chuẩn vào thay vì chuỗi tự cắt
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error("Lỗi upload:", error);
      alert("Không thể tải ảnh lên!");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // --- 1. Thêm biến thể thông minh (Tự sinh SKU và tách Size) ---
  const addVariant = () => {
    if (!newColor && !newSize) return alert("Vui lòng nhập màu hoặc size!");

    const sizes = newSize ? newSize.split(',').map(s => s.trim()).filter(s => s) : [''];
    const colors = newColor ? newColor.split(',').map(c => c.trim()).filter(c => c) : [''];

    let newVariants: any[] = [];

    colors.forEach(c => {
      sizes.forEach(s => {
        // Tự động tạo SKU: SP-[Màu]-[Size]-[Random]
        const autoSku = `SP-${(c || "K").toUpperCase().replace(/\s/g, "")}-${(s || "K").toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        newVariants.push({
          id: "temp_" + Math.random().toString(36).substr(2, 9),
          color: c || null,
          size: s || null,
          sku: autoSku,
          stock: parseInt(newStock) || 0,
          price: newPrice ? parseFloat(newPrice) : parseFloat(price),
        });
      });
    });

    setVariants([...variants, ...newVariants]);
    setNewColor(""); setNewSize(""); setNewStock(""); setNewPrice("");
  };

  // --- 0. Quản lý thông số kỹ thuật (Specifications) ---
  const addSpecification = () => {
    if (!newSpecName) return alert("Vui lòng nhập tên thông số!");
    setSpecifications([...specifications, { name: newSpecName, value: newSpecValue || "" }]);
    setNewSpecName("");
    setNewSpecValue("");
  };

  const removeSpecification = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };
  // --- 2. Chọn ảnh chuyên dụng cho một Màu Sắc ---
  const pickImageForColorGroup = async (color: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return alert("Cần cấp quyền truy cập ảnh!");

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6,
    });

    if (!result.canceled) {
      const newImage: ProductImage = {
        localUri: result.assets[0].uri,
        url: "",
        image_type: 'variant',
        colorKey: color, // Gắn mác ảnh này thuộc về màu sắc này
        is_thumbnail: false,
        display_order: productImages.length,
      };

      // Xóa ảnh cũ của màu này (nếu có) và thêm ảnh mới
      setProductImages(prev => {
        const filtered = prev.filter(p => {
          const isSameColor = p.image_type === 'variant' && 
            (p.colorKey === color || (p.variant_id && (variants.find(v => v.id === p.variant_id)?.color || "Không phân màu") === color));
          return !isSameColor;
        });
        return [...filtered, newImage];
      });
    }
  };

  // --- 2. Hàm cập nhật trực tiếp Giá và Tồn kho trên danh sách ---
  const updateVariantField = (id: string, field: string, value: string) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(v => v.id !== id));
  };

  // Hàm Lưu dữ liệu
  const handleSave = async () => {
    if (!name) return alert("Vui lòng nhập tên sản phẩm!");

    const mainPriceNum = (price === "" || price === undefined || price === null) ? 0 : parseFloat(price);

    let isProductActive = true;
    let willBeHidden = false;
    let needsConfirmation = false;

    if (variants.length > 0) {
      for (const v of variants) {
        const p = (v.price === "" || v.price === undefined || v.price === null) ? 0 : parseFloat(v.price);
        const s = (v.stock === "" || v.stock === undefined || v.stock === null) ? 0 : parseInt(String(v.stock));
        if (p === 0) {
          willBeHidden = true;
          if (s > 0) {
            needsConfirmation = true;
          }
        }
      }
    } else if (mainPriceNum === 0) {
      willBeHidden = true;
    }

    if (willBeHidden) {
      if (needsConfirmation) {
        if (Platform.OS === 'web') {
          const ok = window.confirm("Cảnh báo: Sản phẩm có phân loại giá 0đ nhưng vẫn còn tồn kho.\n\nSản phẩm sẽ tự động chuyển sang trạng thái NGƯNG BÁN. Bạn có muốn tiếp tục lưu?");
          if (!ok) return;
        } else {
          const ok = await new Promise(resolve => {
            Alert.alert(
              "Cảnh báo Nhầm lẫn Báo giá",
              "Sản phẩm có phân loại đang để giá 0đ nhưng vẫn khai báo còn tồn kho.\n\nSản phẩm sẽ TỰ ĐỘNG CHUYỂN SANG TRẠNG THÁI NGƯNG BÁN để tránh rủi ro. Bạn có chắc chắn muốn lưu?",
              [
                { text: "Hủy", onPress: () => resolve(false), style: "cancel" },
                { text: "Lưu & Ngưng bán", onPress: () => resolve(true), style: "destructive" }
              ]
            );
          });
          if (!ok) return;
        }
      }
      isProductActive = false;
    }

    setSaving(true);

    try {
      const productId = isNew ? null : id;

      // 1. Upload các ảnh mới
      const updatedImages = await Promise.all(productImages.map(async (img) => {
        if (img.localUri && !img.url) {
          const uploadedUrl = await uploadImageToStorage(img.localUri);
          return { ...img, url: uploadedUrl || "" };
        }
        return img;
      }));

      if (updatedImages.some(img => !img.url)) {
        throw new Error("Lỗi upload một số hình ảnh. Vui lòng thử lại.");
      }
      // --- BẮT ĐẦU ĐOẠN CODE FIX ẢNH BÌA ---

      // Lọc và sắp xếp để Ảnh Bìa (is_thumbnail) luôn đứng vị trí đầu tiên [0]
      const sortedImages = [...updatedImages].sort((a, b) => {
        if (a.is_thumbnail) return -1;
        if (b.is_thumbnail) return 1;
        return a.display_order - b.display_order;
      });

      // Rút trích ra mảng chỉ chứa các chuỗi URL
      const imageUrlsForProduct = sortedImages.map(img => img.url);

      // 2. Lưu/Cập nhật Product
      const productData = {
        name,
        price: mainPriceNum,
        description,
        short_description: shortDescription,
        is_active: isProductActive,
        images: imageUrlsForProduct, // <--- ĐẨY MẢNG ẢNH VÀO CỘT IMAGES CỦA BẢNG PRODUCTS Ở ĐÂY
        specifications, // <--- THỰC HIỆN LƯU THÔNG SỐ KỸ THUẬT Ở ĐÂY
        category_id: selectedCategoryId,
      };

      // --- KẾT THÚC ĐOẠN CODE FIX ẢNH BÌA ---



      let finalProductId = productId;
      if (isNew) {
        const { data: newProd, error: prodErr } = await supabase.from("products").insert([productData]).select().single();
        if (prodErr) throw prodErr;
        finalProductId = newProd.id;
      } else {
        const { error: prodErr } = await supabase.from("products").update(productData).eq("id", id);
        if (prodErr) throw prodErr;
      }


      // 3. Quản lý Variants (Dùng Upsert để giữ ID)
      // Xóa các variants cũ không còn trong list
      if (!isNew) {
        const variantIdsToKeep = variants.filter(v => !v.id.startsWith("temp")).map(v => v.id);
        if (variantIdsToKeep.length > 0) {
          await supabase.from("product_variants").delete().eq("product_id", finalProductId).not("id", "in", variantIdsToKeep);
        } else {
          await supabase.from("product_variants").delete().eq("product_id", finalProductId);
        }
      }

      // --- ĐOẠN ĐƯỢC FIX ---
      const variantsToUpsert = variants.map(v => {
        const parsedStock = (v.stock === "" || v.stock === undefined || v.stock === null) ? 0 : parseInt(String(v.stock));
        const parsedPrice = (v.price === "" || v.price === undefined || v.price === null) ? 0 : parseFloat(String(v.price));

        const variantData: any = {
          product_id: finalProductId,
          color: v.color,
          size: v.size,
          sku: v.sku,
          stock: parsedStock,
          price: parsedPrice,
        };

        // CHỈ gắn thuộc tính 'id' vào payload nếu nó là ID thật từ DB (không phải temp)
        // Nếu là 'temp', chúng ta tuyệt đối không gửi trường 'id' lên để Supabase tự tạo mới
        if (!v.id.startsWith("temp")) {
          variantData.id = v.id;
        }

        return variantData;
      });
      // ----------------------

      // --- ĐOẠN FIX LỖI NULL VALUE IN COLUMN "ID" ---
      // Tách biến thể mới và biến thể cũ để xử lý riêng, tránh việc PostgREST điền null vào cột id khi upsert mảng hỗn hợp
      const newVariantsToInsert = variantsToUpsert.filter(v => !v.id);
      const existingVariantsToUpsert = variantsToUpsert.filter(v => v.id);

      let savedVariants: any[] = [];

      // 1. Lưu các biến thể mới (Không gửi kèm ID để DB tự generate)
      if (newVariantsToInsert.length > 0) {
        const { data: newlyInserted, error: insErr } = await supabase
          .from("product_variants")
          .insert(newVariantsToInsert)
          .select();
        if (insErr) throw insErr;
        if (newlyInserted) savedVariants.push(...newlyInserted);
      }

      // 2. Cập nhật các biến thể cũ (Có kèm ID)
      if (existingVariantsToUpsert.length > 0) {
        const { data: updated, error: updErr } = await supabase
          .from("product_variants")
          .upsert(existingVariantsToUpsert)
          .select();
        if (updErr) throw updErr;
        if (updated) savedVariants.push(...updated);
      }
      // ----------------------------------------------

      // 4. Lưu Hình ảnh vào product_images
      // Xóa ảnh cũ
      await supabase.from("product_images").delete().eq("product_id", finalProductId);

      // Chuẩn bị data insert cho images
      const imagesToInsert = updatedImages.map((img, index) => {
        let varId = img.variant_id;

        // 1. Nếu là ảnh được gán theo nhóm màu (UI Shopee mới)
        if (img.image_type === 'variant' && img.colorKey) {
          const matchedVariant = savedVariants.find(sv => (sv.color || "Không phân màu") === img.colorKey);
          varId = matchedVariant ? matchedVariant.id : null;
        }
        // 2. Nếu là ảnh được gán trực tiếp qua chip (UI tổng quát) và vẫn mang ID tạm
        else if (varId && varId.startsWith("temp_")) {
          const tempVariant = variants.find(v => v.id === varId);
          if (tempVariant) {
            // Tìm variant thật trong DB khớp với Color/Size của variant tạm
            const realVariant = savedVariants.find(sv =>
              sv.color === tempVariant.color && sv.size === tempVariant.size
            );
            varId = realVariant ? realVariant.id : null;
          } else {
            varId = null;
          }
        }

        return {
          product_id: finalProductId,
          variant_id: varId,
          url: img.url,
          is_thumbnail: img.is_thumbnail,
          image_type: img.image_type,
          display_order: index
        };
      });
      console.log(imagesToInsert);

      const { error: imgErr } = await supabase.from("product_images").insert(imagesToInsert);
      if (imgErr) throw imgErr;

      alert(isNew ? "Thêm sản phẩm thành công!" : "Cập nhật thành công!");
      
      // Xoá cờ thay đổi ngay trước khi rời đi để vô hiệu hóa prompt chặn
      setHasUnsavedChanges(false);
      
      // Thủ thuật: Đợi một nhịp nhỏ để state 'hasUnsavedChanges' kịp update trước khi nhảy trang
      setTimeout(() => {
        router.push("/(admin)/products");
      }, 0);
      
    } catch (err: any) {
      console.error(err);
      alert("Đã có lỗi xảy ra: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={handleCustomUiBack} style={styles.backBtn}>
            <ArrowLeft color="#374151" size={20} />
          </Pressable>
          <Text style={styles.title}>{isNew ? "Thêm Sản phẩm mới" : "Sửa Sản phẩm"}</Text>
        </View>

        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="white" /> : <Save color="white" size={20} />}
          <Text style={styles.saveBtnText}>Lưu</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Card: Thông tin cơ bản */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin cơ bản</Text>

          <Text style={styles.label}>Tên sản phẩm *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="VD: Áo thun nam" />

          <Text style={styles.label}>Giá cơ bản (VNĐ) *</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />

          {/* Danh mục */}
          <Text style={styles.label}>Danh mục</Text>
          <Pressable
            style={[styles.categoryPickerBtn, selectedCategoryId ? styles.categoryPickerBtnActive : null]}
            onPress={() => setShowCategoryPicker(true)}
          >
            {selectedCategoryId ? (
              <Text style={styles.categoryPickerText}>{selectedCategoryName}</Text>
            ) : (
              <Text style={styles.categoryPickerPlaceholder}>Chọn danh mục...</Text>
            )}
            <ChevronDown size={18} color={selectedCategoryId ? "#2563EB" : "#9CA3AF"} />
          </Pressable>

          <Text style={styles.label}>Mô tả ngắn (Hiển thị dưới tên SP)</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: "top" }]}
            value={shortDescription}
            onChangeText={setShortDescription}
            multiline
            placeholder="VD: Áo thun cotton thoáng mát..."
          />

        </View>

        {/* Card: Thông số kỹ thuật & Mô tả */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông số kỹ thuật & Mô tả</Text>
          
          <View style={styles.specInputRow}>
            <TextInput 
              style={[styles.smallInput, { flex: 1 }]} 
              placeholder="Tên (VD: Chất liệu)" 
              value={newSpecName} 
              onChangeText={setNewSpecName} 
            />
            <TextInput 
              style={[styles.smallInput, { flex: 1 }]} 
              placeholder="Giá trị (VD: Cotton 100%, 500g)"
              value={newSpecValue} 
              onChangeText={setNewSpecValue}
            />
            <Pressable style={styles.addSpecBtn} onPress={addSpecification}>
              <Plus size={20} color="white" />
            </Pressable>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.label, { fontSize: 13, color: '#6B7280' }]}>Mô tả chi tiết sản phẩm</Text>
            <TextInput
              style={[styles.input, { height: 120, textAlignVertical: "top", marginBottom: 0 }]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Nhập phần văn bản mô tả chi tiết sản phẩm tại đây..."
            />
          </View>

          <View style={styles.specList}>
            {specifications.map((spec, index) => (
              <View key={index} style={styles.specItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.specLabel}>{spec.name}</Text>
                  <Text style={styles.specValue}>{spec.value}</Text>
                </View>
                <Pressable onPress={() => removeSpecification(index)}>
                  <Trash2 size={18} color="#EF4444" />
                </Pressable>
              </View>
            ))}
            {specifications.length === 0 && (
              <Text style={styles.emptyText}>Chưa có thông số kỹ thuật nào</Text>
            )}
          </View>
        </View>

        {/* Card: Quản lý Hình ảnh */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Hình ảnh sản phẩm</Text>
            <Pressable style={styles.pickBtn} onPress={pickImage} disabled={uploading || saving}>
              <Plus size={18} color="#2563EB" />
              <Text style={styles.pickBtnText}>Tải ảnh</Text>
            </Pressable>
          </View>

          <View style={styles.imageList}>
            {productImages.map((img, index) => (
              <View key={img.id || img.localUri || index} style={styles.imageItem}>
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: img.localUri || img.url }} style={styles.previewImage} />
                  {img.is_thumbnail && (
                    <View style={styles.thumbnailBadge}>
                      <Text style={styles.thumbnailBadgeText}>Ảnh bìa</Text>
                    </View>
                  )}
                  {img.localUri && !img.url && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>Mới</Text>
                    </View>
                  )}
                </View>

                <View style={styles.imageControls}>
                  <View style={styles.controlRow}>
                    <Pressable
                      style={[styles.smallBtn, img.is_thumbnail && styles.activeBtn]}
                      onPress={() => {
                        setProductImages(prev => prev.map((p, i) => ({
                          ...p,
                          is_thumbnail: i === index
                        })));
                      }}
                    >
                      <Text style={[styles.smallBtnText, img.is_thumbnail && styles.activeBtnText]}>Làm ảnh bìa</Text>
                    </Pressable>

                    <Pressable
                      style={styles.removeIconBtn}
                      onPress={() => setProductImages(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </Pressable>
                  </View>

                  <View style={styles.typeSelector}>
                    <Pressable
                      style={[styles.typeBtn, img.image_type === 'general' && styles.activeTypeBtn]}
                      onPress={() => {
                        setProductImages(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], image_type: 'general', variant_id: null };
                          return updated;
                        });
                      }}
                    >
                      <Text style={[styles.typeBtnText, img.image_type === 'general' && styles.activeTypeBtnText]}>Chung</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.typeBtn, img.image_type === 'variant' && styles.activeTypeBtn]}
                      onPress={() => {
                        setProductImages(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], image_type: 'variant' };
                          return updated;
                        });
                      }}
                    >
                      <Text style={[styles.typeBtnText, img.image_type === 'variant' && styles.activeTypeBtnText]}>Biến bản</Text>
                    </Pressable>
                  </View>

                  {img.image_type === 'variant' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variantSelector}>
                      {Object.keys(groupedVariants).map((color) => {
                        const isActive = img.colorKey === color || 
                                       (img.variant_id && (variants.find(v => v.id === img.variant_id)?.color || "Không phân màu") === color);
                        return (
                          <Pressable
                            key={color}
                            style={[styles.variantChip, isActive && styles.activeVariantChip]}
                            onPress={() => {
                              setProductImages(prev => {
                                const updated = [...prev];
                                updated[index] = { ...updated[index], colorKey: color, variant_id: null };
                                return updated;
                              });
                            }}
                          >
                            <Text style={[styles.variantChipText, isActive && styles.activeVariantChipText]}>
                              {color}
                            </Text>
                          </Pressable>
                        );
                      })}
                      {Object.keys(groupedVariants).length === 0 && <Text style={styles.noVariantsPrompt}>Chưa có phân loại</Text>}
                    </ScrollView>
                  )}
                </View>
              </View>
            ))}

            {productImages.length === 0 && (
              <View style={styles.emptyImage}>
                <ImageIcon size={40} color="#9CA3AF" />
                <Text style={styles.emptyText}>Chưa có hình ảnh</Text>
              </View>
            )}
          </View>

          {(uploading || saving) && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.uploadingText}>Đang xử lý dữ liệu...</Text>
            </View>
          )}
        </View>
        {/* Card: Phân loại & Tồn kho (Chuẩn Shopee) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Phân loại & Tồn kho</Text>

          {/* Khu vực tạo nhanh */}
          <View style={styles.variantForm}>
            <View style={{ flex: 1.5, gap: 8 }}>
              <Text style={styles.inputLabel}>Màu (Nhập phẩy để tạo nhiều)</Text>
              <TextInput style={styles.smallInput} value={newColor} onChangeText={setNewColor} placeholder="Đỏ, Đen..." />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.inputLabel}>Size</Text>
              <TextInput style={styles.smallInput} value={newSize} onChangeText={setNewSize} placeholder="M, L, XL..." />
            </View>
            <View style={{ width: 60, gap: 8 }}>
              <Text style={styles.inputLabel}>Kho</Text>
              <TextInput style={styles.smallInput} value={newStock} onChangeText={setNewStock} keyboardType="numeric" />
            </View>
            <Pressable style={styles.addVariantBtn} onPress={addVariant}>
              <Plus size={20} color="white" />
            </Pressable>
          </View>

          {/* HIỂN THỊ DANH SÁCH THEO TỪNG NHÓM MÀU */}
          <View style={{ marginTop: 20, gap: 16 }}>
            {Object.entries(groupedVariants).map(([color, sizeList]) => {
              const colorImg = getImageForColor(color);

              return (
                <View key={color} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
                  {/* Header Của Nhóm Màu & Upload Ảnh */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 12, borderBottomWidth: 1, borderColor: '#E5E7EB' }}>
                    <Pressable
                      onPress={() => pickImageForColorGroup(color)}
                      style={{ width: 50, height: 50, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 12 }}
                    >
                      {colorImg ? (
                        <Image source={{ uri: colorImg.localUri || colorImg.url }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <ImageIcon size={20} color="#9CA3AF" />
                      )}
                    </Pressable>
                    <View>
                      <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#111827' }}>Màu: {color}</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>Chạm vào khung viền để tải ảnh cho màu này</Text>
                    </View>
                  </View>

                  {/* Danh sách các Size thuộc Màu này */}
                  <View style={{ padding: 12, gap: 8 }}>
                    {sizeList.map((v) => (
                      <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white' }}>
                        <View style={{ width: 50 }}>
                          <Text style={{ fontWeight: 'bold', color: '#374151', textAlign: 'center' }}>{v.size || "N/A"}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>SKU</Text>
                          <TextInput style={[styles.smallInput, { paddingVertical: 4, height: 34 }]} value={v.sku} onChangeText={(val) => updateVariantField(v.id, 'sku', val)} />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>Giá (VNĐ)</Text>
                          <TextInput style={[styles.smallInput, { paddingVertical: 4, height: 34 }]} value={v.price !== undefined && v.price !== null ? String(v.price) : ""} onChangeText={(val) => updateVariantField(v.id, 'price', val)} keyboardType="numeric" />
                        </View>

                        <View style={{ flex: 0.8 }}>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>Kho</Text>
                          <TextInput style={[styles.smallInput, { paddingVertical: 4, height: 34 }]} value={v.stock !== undefined && v.stock !== null ? String(v.stock) : ""} onChangeText={(val) => updateVariantField(v.id, 'stock', val)} keyboardType="numeric" />
                        </View>

                        <Pressable onPress={() => removeVariant(v.id)} style={{ padding: 4, marginTop: 14 }}>
                          <Trash2 size={18} color="#EF4444" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Modal chọn danh mục */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Danh mục</Text>
              <Pressable onPress={() => setShowCategoryPicker(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.categoryList}>
              {/* Tùy chọn "Không phân loại" */}
              <Pressable
                style={[
                  styles.categoryItem,
                  selectedCategoryId === null && styles.categoryItemActive,
                ]}
                onPress={() => {
                  setSelectedCategoryId(null);
                  setShowCategoryPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.categoryItemText,
                    selectedCategoryId === null && styles.categoryItemTextActive,
                  ]}
                >
                  Không phân loại
                </Text>
              </Pressable>

              {/* Danh sách danh mục phẳng */}
              {flatCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryItem,
                    selectedCategoryId === cat.id && styles.categoryItemActive,
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(cat.id);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryItemText,
                      { paddingLeft: cat.depth * 20 + 8 },
                      selectedCategoryId === cat.id && styles.categoryItemTextActive,
                    ]}
                  >
                    {cat.depth > 0 ? "└ " : ""}
                    {cat.name_vi || cat.name}
                    {!cat.is_active && " (Ẩn)"}
                  </Text>
                </Pressable>
              ))}

              {flatCategories.length === 0 && (
                <Text style={styles.emptyCategoryText}>Chưa có danh mục nào</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  backBtn: { padding: 8, backgroundColor: "#F3F4F6", borderRadius: 8 },
  title: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  saveBtn: { flexDirection: "row", backgroundColor: "#10B981", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, gap: 8, alignItems: "center" },
  saveBtnText: { color: "white", fontWeight: "600" },
  scrollContent: { padding: 20, gap: 20 },
  card: { backgroundColor: "white", padding: 20, borderRadius: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16, color: "#111827" },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 15, outlineStyle: "none" } as any,
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  pickBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#EFF6FF" },
  pickBtnText: { color: "#2563EB", fontWeight: "600", fontSize: 14 },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  imageWrapper: { width: 100, height: 100, borderRadius: 12, overflow: "hidden", backgroundColor: "#F3F4F6", position: "relative" },
  previewImage: { width: "100%", height: "100%" },
  removeBtn: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(239, 68, 68, 0.8)", padding: 6, borderRadius: 20 },
  newBadge: { position: "absolute", bottom: 4, left: 4, backgroundColor: "#10B981", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  emptyImage: { flex: 1, height: 100, borderStyle: "dashed", borderWidth: 2, borderColor: "#E5E7EB", borderRadius: 12, justifyContent: "center", alignItems: "center", gap: 8 },
  emptyText: { color: "#9CA3AF", fontSize: 14 },
  uploadingOverlay: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
  uploadingText: { color: "#2563EB", fontSize: 14, fontWeight: "500" },

  // Image Management Styles
  imageList: { gap: 16 },
  imageItem: { flexDirection: "row", gap: 12, backgroundColor: "#F9FAFB", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  imagePreviewContainer: { width: 80, height: 80, borderRadius: 8, overflow: "hidden", position: "relative" },
  thumbnailBadge: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "#2563EB", paddingVertical: 2, alignItems: "center" },
  thumbnailBadgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  imageControls: { flex: 1, gap: 8 },
  controlRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  smallBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: "#E5E7EB" },
  activeBtn: { backgroundColor: "#2563EB" },
  smallBtnText: { fontSize: 11, color: "#4B5563", fontWeight: "600" },
  activeBtnText: { color: "white" },
  removeIconBtn: { padding: 4 },
  typeSelector: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 4, alignItems: "center", borderRadius: 4, borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "white" },
  activeTypeBtn: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  typeBtnText: { fontSize: 12, color: "#6B7280" },
  activeTypeBtnText: { color: "#2563EB", fontWeight: "600" },
  variantSelector: { flexDirection: "row", paddingVertical: 4 },
  variantChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: "white", borderWidth: 1, borderColor: "#D1D5DB", marginRight: 8 },
  activeVariantChip: { borderColor: "#2563EB", backgroundColor: "#2563EB" },
  variantChipText: { fontSize: 11, color: "#6B7280" },
  activeVariantChipText: { color: "white", fontWeight: "600" },
  noVariantsPrompt: { fontSize: 11, color: "#9CA3AF", fontStyle: "italic" },

  variantForm: { flexDirection: "row", gap: 10, alignItems: "flex-end", marginBottom: 20 },
  inputLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  smallInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 6, padding: 8, fontSize: 13, outlineStyle: "none" } as any,
  addVariantBtn: { backgroundColor: "#2563EB", padding: 8, borderRadius: 6, justifyContent: "center" },
  variantListContainer: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  variantRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  variantMainText: { fontSize: 14, fontWeight: "600", color: "#111827" },
  variantSubText: { fontSize: 12, color: "#6B7280" },

  // Specifications Styles
  specInputRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  addSpecBtn: { backgroundColor: "#2563EB", padding: 8, borderRadius: 6, justifyContent: "center" },
  specList: { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  specItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  specLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  specValue: { fontSize: 14, color: "#111827", marginTop: 2 },

  // Category Picker Styles
  categoryPickerBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  categoryPickerBtnActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  categoryPickerText: { fontSize: 15, color: "#111827", flex: 1 },
  categoryPickerPlaceholder: { fontSize: 15, color: "#9CA3AF", flex: 1 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtnText: { fontSize: 16, color: "#374151" },
  categoryList: { paddingVertical: 8 },
  categoryItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  categoryItemActive: { backgroundColor: "#EFF6FF" },
  categoryItemText: { fontSize: 15, color: "#374151" },
  categoryItemTextActive: { color: "#2563EB", fontWeight: "600" },
  emptyCategoryText: {
    textAlign: "center",
    paddingVertical: 40,
    fontSize: 14,
    color: "#9CA3AF",
  },
});