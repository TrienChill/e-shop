import { Camera, Star, StarHalf, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLORS = {
  primary: "#0055FF",
  secondary: "#1A1A1A",
  textGray: "#6B7280",
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
  star: "#FBBF24",
  border: "#E5E7EB",
};

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { rating: number; comment: string }) => void;
  product: {
    name: string;
    variant: string;
    image: string;
  } | null;
}

export default function ReviewModal({
  visible,
  onClose,
  onSubmit,
  product,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Reset state mỗi khi modal hiển thị hoặc sản phẩm thay đổi
  React.useEffect(() => {
    if (visible) {
      setRating(0);
      setComment("");
    }
  }, [visible, product?.name]); // Trigger reset khi mở hoặc đổi tên SP

  const handleStarPress = (index: number, isHalf: boolean) => {
    const newRating = index + (isHalf ? 0.5 : 1);
    setRating(newRating);
  };

  const renderStar = (index: number) => {
    const filled = rating >= index + 1;
    const half = !filled && rating >= index + 0.5;

    return (
      <View key={index} style={styles.starWrapper}>
        {/* Full Star Background */}
        <Star size={42} color={COLORS.border} fill="transparent" />

        {/* Half Star Overlay */}
        <View style={styles.starOverlay}>
          {half ? (
            <StarHalf size={42} color={COLORS.star} fill={COLORS.star} />
          ) : filled ? (
            <Star size={42} color={COLORS.star} fill={COLORS.star} />
          ) : null}
        </View>

        {/* Interaction Areas */}
        <View style={styles.hitboxContainer}>
          <TouchableOpacity
            style={styles.halfHitbox}
            onPress={() => handleStarPress(index, true)}
            activeOpacity={0.7}
          />
          <TouchableOpacity
            style={styles.halfHitbox}
            onPress={() => handleStarPress(index, false)}
            activeOpacity={0.7}
          />
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIndicator} />
            <Text style={styles.modalTitle}>Cảm nhận của bạn về sản phẩm?</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.modalScroll}
          >
            <View style={styles.reviewTarget}>
              <Image
                source={{ uri: product?.image }}
                style={styles.modalProductImage}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalProductName}>{product?.name}</Text>
                <Text style={styles.modalProductVariant}>{product?.variant}</Text>
              </View>
            </View>

            <View style={styles.starSelection}>
              {[0, 1, 2, 3, 4].map((i) => renderStar(i))}
            </View>
            
            <Text style={styles.ratingValueText}>
              {rating > 0 ? `${rating.toFixed(1)} / 5.0` : "Chọn số sao"}
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Hãy chia sẻ cảm nhận của bạn về chất lượng sản phẩm nhé..."
                placeholderTextColor={COLORS.textGray}
                multiline
                numberOfLines={5}
                style={styles.textInput}
                value={comment}
                onChangeText={setComment}
              />
            </View>

            <TouchableOpacity style={styles.uploadBtn}>
              <Camera size={24} color={COLORS.primary} />
              <Text style={styles.uploadText}>Thêm hình ảnh thực tế</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                rating === 0 && { backgroundColor: COLORS.lightGray },
              ]}
              onPress={() => onSubmit({ rating, comment })}
              disabled={rating === 0}
            >
              <Text
                style={[
                  styles.submitBtnText,
                  rating === 0 && { color: COLORS.textGray },
                ]}
              >
                Gửi đánh giá ngay
              </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalBackdrop: { flex: 1 },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "85%",
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 16,
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    top: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.secondary,
  },
  modalScroll: {
    paddingHorizontal: 24,
  },
  reviewTarget: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  modalProductImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  modalProductName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  modalProductVariant: {
    fontSize: 13,
    color: COLORS.textGray,
    marginTop: 2,
  },
  starSelection: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
    gap: 8,
  },
  starWrapper: {
    position: "relative",
    width: 42,
    height: 42,
  },
  starOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  hitboxContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
  },
  halfHitbox: {
    flex: 1,
    height: "100%",
  },
  ratingValueText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.star,
    marginTop: 12,
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  textInput: {
    fontSize: 15,
    color: COLORS.secondary,
    height: 120,
    textAlignVertical: "top",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E6EFFF",
    borderStyle: "dashed",
    gap: 12,
  },
  uploadText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    marginTop: 32,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },
});
