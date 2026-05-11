import { CommonHeader } from "@/src/components/layout/Header";
import * as FileSystem from "expo-file-system";
import { EncodingType, readAsStringAsync } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  RefreshCw,
  Save,
  Shirt,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// API URL - được cấu hình trong file .env
const API_URL = process.env.EXPO_PUBLIC_TRYON_API_URL || "";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_BOX_SIZE = (SCREEN_WIDTH - 48) / 2;

// Màu sắc tiếng Việt
const colorTranslations: Record<string, string> = {
  Black: "Đen",
  White: "Trắng",
  Red: "Đỏ",
  Blue: "Xanh dương",
  Yellow: "Vàng",
  Green: "Xanh lá",
  Pink: "Hồng",
  Gray: "Xám",
  Orange: "Cam",
  Brown: "Nâu",
  Purple: "Tím",
};

type TryOnState = "idle" | "loading" | "result" | "error";

// --- GLOBAL STATE CHO CHẠY NGẦM ---
let globalTryOnState: TryOnState = "idle";
let globalResultUrl: string = "";
let globalErrorMsg: string = "";
let globalPersonImage: any = null;
let globalClothImage: string = "";

let setMountedState: React.Dispatch<React.SetStateAction<TryOnState>> | null = null;
let setMountedResultUrl: React.Dispatch<React.SetStateAction<string>> | null = null;
let setMountedErrorMsg: React.Dispatch<React.SetStateAction<string>> | null = null;
// ----------------------------------

export default function VirtualTryOnScreen() {
  const { productImageUrl, selectedColor } = useLocalSearchParams<{
    productImageUrl?: string;
    selectedColor?: string;
  }>();
  const router = useRouter();

  const [personImage, setPersonImage] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(globalPersonImage);
  const [clothImage, setClothImage] = useState<string>(globalClothImage || productImageUrl || "");
  const [clothColor] = useState<string>(selectedColor || "");
  const [state, setState] = useState<TryOnState>(globalTryOnState);
  const [resultUrl, setResultUrl] = useState<string>(globalResultUrl);
  const [errorMsg, setErrorMsg] = useState<string>(globalErrorMsg);

  const updateGlobalAndLocal = (
    newState: TryOnState,
    url: string = "",
    error: string = ""
  ) => {
    globalTryOnState = newState;
    globalResultUrl = url;
    globalErrorMsg = error;

    if (setMountedState) setMountedState(newState);
    if (setMountedResultUrl) setMountedResultUrl(url);
    if (setMountedErrorMsg) setMountedErrorMsg(error);
  };

  useEffect(() => {
    setMountedState = setState;
    setMountedResultUrl = setResultUrl;
    setMountedErrorMsg = setErrorMsg;

    // Reset nếu vào thử sản phẩm mới khác sản phẩm cũ
    if (productImageUrl && productImageUrl !== globalClothImage && globalTryOnState !== "loading") {
      globalClothImage = productImageUrl;
      updateGlobalAndLocal("idle", "", "");
      setClothImage(productImageUrl);
    }

    return () => {
      setMountedState = null;
      setMountedResultUrl = null;
      setMountedErrorMsg = null;
    };
  }, [productImageUrl]);

  // Hàm helper bị lược bỏ vì hiện tại dùng base64, không cần revoke object URL nữa

  const pickPersonImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Cần quyền truy cập",
          "Vui lòng cấp quyền truy cập thư viện ảnh để tiếp tục.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const filename = asset.uri.split("/").pop() || "person.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1] : "jpg";
        const name = `photo_${Date.now()}.${ext}`;
        const type = asset.mimeType || `image/${ext}`;

        const newPersonImage = { uri: asset.uri, name, type };
        setPersonImage(newPersonImage);
        globalPersonImage = newPersonImage;
        updateGlobalAndLocal("idle");
      }
    } catch {
      Alert.alert("Lỗi", "Không thể chọn ảnh. Vui lòng thử lại.");
    }
  };

  // Hàm chuyển đổi file thành base64
  const fileToBase64 = async (uri: string): Promise<string> => {
    try {
      // Nếu là URL từ xa (bắt đầu bằng http)
      if (uri.startsWith("http")) {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Nếu là file cục bộ (bắt đầu bằng file:// hoặc content://)
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // React Native: sử dụng expo-file-system/legacy
        const base64 = await readAsStringAsync(uri, {
          encoding: EncodingType.Base64,
        });
        return `data:image/jpeg;base64,${base64}`;
      }
    } catch (error) {
      console.error("Error converting to base64:", error);
      throw new Error("Không thể đọc ảnh");
    }
  };

  const handleTryOn = async () => {
    if (!personImage) {
      Alert.alert("Thiếu ảnh", "Vui lòng tải lên ảnh của bạn trước.");
      return;
    }

    if (!clothImage) {
      Alert.alert("Thiếu ảnh sản phẩm", "Không có ảnh sản phẩm để thử.");
      return;
    }

    globalPersonImage = personImage;
    globalClothImage = clothImage;

    updateGlobalAndLocal("loading");

    Alert.alert(
      "Đang xử lý",
      "Hệ thống đang tạo ảnh thử đồ ảo. Bạn có thể thoát ra xem sản phẩm khác, chúng tôi sẽ thông báo khi hoàn tất!"
    );

    try {
      // Chuyển ảnh thành base64
      const personBase64 = await fileToBase64(personImage.uri);
      const clothBase64 = await fileToBase64(clothImage);

      // Gửi request với JSON body
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          person_image: personBase64,
          cloth_image: clothBase64,
          category: "upper_body",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Lỗi server: ${response.status}`);
      }

      // Nhận ảnh kết quả dạng blob
      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("Server trả về ảnh rỗng");
      }

      // Đọc blob thành base64 để tương thích với React Native
      const base64Url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      updateGlobalAndLocal("result", base64Url, "");
      
      // Nếu component đã unmount (người dùng thoát ra)
      if (!setMountedState) {
        Alert.alert(
          "Thử đồ hoàn tất 🎉",
          "Ảnh thử đồ ảo của bạn đã sẵn sàng! Hãy quay lại màn hình Thử đồ để xem kết quả."
        );
      }
    } catch (err: any) {
      let msg = "Đã xảy ra lỗi khi gọi API.";

      if (err.name === "AbortError") {
        msg = "Yêu cầu bị timeout. Vui lòng thử lại sau.";
      } else if (
        err.message.includes("Failed to fetch") ||
        err.message.includes("NetworkError") ||
        err.message.includes("net::ERR")
      ) {
        msg =
          "Không thể kết nối đến server thử đồ. Vui lòng kiểm tra:\n• Server thử đồ đang chạy\n• Kết nối internet của bạn";
      } else if (err instanceof Error) {
        msg = err.message;
      }

      updateGlobalAndLocal("error", "", msg);
      
      if (!setMountedState) {
        Alert.alert("Lỗi thử đồ", "Có lỗi xảy ra trong quá trình ghép đồ. Vui lòng quay lại kiểm tra.");
      }
    }
  };

  const handleRetry = () => {
    updateGlobalAndLocal("idle");
  };

  const handleSaveImage = async () => {
    try {
      if (!resultUrl) return;

      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = resultUrl;
        link.download = `try-on-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert("Ảnh kết quả đã được tải xuống.");
      } else {
        // Tách chuỗi base64 (nếu có prefix data:image/jpeg;base64,)
        const base64Code = resultUrl.includes("base64,") 
          ? resultUrl.split("base64,")[1] 
          : resultUrl;

        const filename = `${FileSystem.documentDirectory}try-on-${Date.now()}.jpg`;
        
        await FileSystem.writeAsStringAsync(filename, base64Code, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === "granted") {
          await MediaLibrary.saveToLibraryAsync(filename);
          Alert.alert("Thành công", "Ảnh đã được lưu vào thư viện của bạn.");
        } else {
          Alert.alert("Lỗi", "Cần cấp quyền truy cập thư viện để lưu ảnh.");
        }
      }
    } catch (error) {
      console.error("Save image error:", error);
      Alert.alert("Lỗi", "Không thể lưu ảnh.");
    }
  };

  const canTryOn = !!personImage && !!clothImage;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <CommonHeader
        title="Thử đồ ảo"
        renderLeft={() => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section 1: Two image boxes */}
        <View style={styles.imageRow}>
          {/* Person image */}
          <TouchableOpacity
            style={[styles.imageBox, styles.personBox]}
            onPress={pickPersonImage}
            activeOpacity={0.7}
          >
            {personImage ? (
              <Image
                source={{ uri: personImage.uri }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Camera size={32} color="#9CA3AF" />
                <Text style={styles.placeholderLabel}>Tải ảnh của bạn</Text>
              </View>
            )}
            <View style={styles.overlayBadge}>
              <Text style={styles.overlayBadgeText}>
                {personImage ? "Đổi ảnh" : "Chọn ảnh"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Product image */}
          <View style={[styles.imageBox, styles.productBox]}>
            {clothImage ? (
              <Image
                source={{ uri: clothImage }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Shirt size={32} color="#9CA3AF" />
                <Text style={styles.placeholderLabel}>Chưa có sản phẩm</Text>
              </View>
            )}
            <View style={[styles.overlayBadge, styles.productBadge]}>
              <Shirt size={12} color="#fff" />
              <Text style={[styles.overlayBadgeText, { marginLeft: 4 }]}>
                {clothColor
                  ? `${colorTranslations[clothColor] || clothColor}`
                  : "Sản phẩm"}
              </Text>
            </View>
          </View>
        </View>

        {/* Section 2: Action button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            !canTryOn && styles.primaryButtonDisabled,
          ]}
          onPress={handleTryOn}
          disabled={!canTryOn || state === "loading"}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.primaryButtonText,
              !canTryOn && styles.primaryButtonTextDisabled,
            ]}
          >
            Bắt đầu thử đồ
          </Text>
        </TouchableOpacity>

        {/* Section 3: Loading state */}
        {state === "loading" && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>
              AI đang xử lý ghép đồ, vui lòng đợi khoảng 15-30 giây...
            </Text>
          </View>
        )}

        {/* Section 4: Result */}
        {state === "result" && (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <CheckCircle2 size={20} color="#10B981" />
              <Text style={styles.resultTitle}>Kết quả thử đồ</Text>
            </View>

            <Image
              source={{ uri: resultUrl }}
              style={styles.resultImage}
              resizeMode="contain"
            />

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleRetry}
                activeOpacity={0.7}
              >
                <RefreshCw size={18} color="#3B82F6" />
                <Text style={styles.secondaryButtonText}>Thử lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSaveImage}
                activeOpacity={0.7}
              >
                <Save size={18} color="#3B82F6" />
                <Text style={styles.secondaryButtonText}>Lưu ảnh</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Error state */}
        {state === "error" && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.retryErrorButton}
              onPress={handleRetry}
              activeOpacity={0.7}
            >
              <RefreshCw size={16} color="#fff" />
              <Text style={styles.retryErrorText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  imageRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  imageBox: {
    width: IMAGE_BOX_SIZE,
    height: IMAGE_BOX_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  personBox: {
    borderWidth: 2,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
  },
  productBox: {
    borderWidth: 2,
    borderColor: "#10B981",
    borderStyle: "dashed",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  placeholderLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  overlayBadge: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    backgroundColor: "rgba(59, 130, 246, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  productBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.85)",
  },
  overlayBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  primaryButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButtonTextDisabled: {
    color: "#9CA3AF",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  resultContainer: {
    marginTop: 4,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  resultImage: {
    width: "100%",
    height: SCREEN_WIDTH * 1.2,
    backgroundColor: "#E5E7EB",
    borderRadius: 16,
    marginBottom: 20,
  },
  resultActions: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    color: "#3B82F6",
    fontSize: 15,
    fontWeight: "600",
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
    textAlign: "center",
  },
  retryErrorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  retryErrorText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
