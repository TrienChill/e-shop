import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  Facebook,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react-native";
import { CommonHeader } from "@/src/components/layout/Header";

const AboutScreen = () => {
  const router = useRouter();
  const appVersion = "1.0.0";
  const appName = "E-Shop";

  const handleSocialPress = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("An error occurred", err));
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <CommonHeader
        title="Về E-Shop"
        renderLeft={() => (
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
        )}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Logo & Brand Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Text style={styles.logoLetter}>E</Text>
            </View>
          </View>
          <Text style={styles.brandName}>{appName}</Text>
          <Text style={styles.brandTagline}>Trải nghiệm mua sắm đẳng cấp</Text>
          <Text style={styles.versionText}>Phiên bản {appVersion}</Text>
        </View>

        {/* About Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chào mừng đến với E-Shop</Text>
          <Text style={styles.aboutText}>
            E-Shop là nền tảng thương mại điện tử hàng đầu, cung cấp hàng ngàn sản phẩm chất lượng từ thời trang,
            điện tử đến đồ gia dụng. Chúng tôi cam kết mang lại trải nghiệm mua sắm tuyệt vời nhất với giao diện
            hiện đại, tính năng thử đồ ảo độc đáo và dịch vụ khách hàng tận tâm.
          </Text>
        </View>

        {/* Our Commitments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cam kết của chúng tôi</Text>
          
          <View style={styles.commitmentItem}>
            <View style={[styles.iconContainer, { backgroundColor: "#EEF2FF" }]}>
              <ShieldCheck size={24} color="#4F46E5" />
            </View>
            <View style={styles.commitmentContent}>
              <Text style={styles.commitmentTitle}>Chất lượng đảm bảo</Text>
              <Text style={styles.commitmentDesc}>100% sản phẩm chính hãng, được kiểm định nghiêm ngặt.</Text>
            </View>
          </View>

          <View style={styles.commitmentItem}>
            <View style={[styles.iconContainer, { backgroundColor: "#ECFDF5" }]}>
              <Truck size={24} color="#10B981" />
            </View>
            <View style={styles.commitmentContent}>
              <Text style={styles.commitmentTitle}>Giao hàng siêu tốc</Text>
              <Text style={styles.commitmentDesc}>Nhận hàng nhanh chóng trong vòng 24-48 giờ trên toàn quốc.</Text>
            </View>
          </View>

          <View style={styles.commitmentItem}>
            <View style={[styles.iconContainer, { backgroundColor: "#FFFBEB" }]}>
              <Star size={24} color="#F59E0B" />
            </View>
            <View style={styles.commitmentContent}>
              <Text style={styles.commitmentTitle}>Dịch vụ tận tâm</Text>
              <Text style={styles.commitmentDesc}>Hỗ trợ khách hàng 24/7, luôn lắng nghe và giải quyết mọi vấn đề.</Text>
            </View>
          </View>
        </View>

        {/* Features / Virtual Try-On Highlight */}
        <TouchableOpacity 
          style={styles.highlightCard}
          onPress={() => router.push("/(shop)/try-on")}
        >
          <View style={styles.highlightContent}>
            <Text style={styles.highlightTitle}>Tính năng độc đáo</Text>
            <Text style={styles.highlightDesc}>Thử đồ ảo AI giúp bạn chọn trang phục phù hợp nhất ngay tại nhà.</Text>
          </View>
          <ChevronRight size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
          
          <TouchableOpacity style={styles.contactItem} onPress={() => handleSocialPress("tel:19001234")}>
            <Phone size={20} color="#6B7280" />
            <Text style={styles.contactText}>1900 1234</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem} onPress={() => handleSocialPress("mailto:support@eshop.com")}>
            <Mail size={20} color="#6B7280" />
            <Text style={styles.contactText}>support@eshop.com</Text>
          </TouchableOpacity>

          <View style={styles.contactItem}>
            <MapPin size={20} color="#6B7280" />
            <Text style={styles.contactText}>Số 1, Đại Cồ Việt, Hai Bà Trưng, Hà Nội</Text>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.socialSection}>
          <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialPress("https://facebook.com")}>
            <Facebook size={24} color="#1877F2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialPress("https://instagram.com")}>
            <Instagram size={24} color="#E4405F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialPress("https://eshop.com")}>
            <Globe size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.copyrightText}>© 2024 E-Shop. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#F8FAFC",
  },
  logoContainer: {
    marginBottom: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-10deg" }],
  },
  logoLetter: {
    color: "#FFFFFF",
    fontSize: 48,
    fontWeight: "900",
    transform: [{ rotate: "10deg" }],
  },
  brandName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F172A",
  },
  brandTagline: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  versionText: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 12,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#475569",
    textAlign: "justify",
  },
  commitmentItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  commitmentContent: {
    flex: 1,
  },
  commitmentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  commitmentDesc: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  highlightCard: {
    margin: 24,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#4F46E5",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  highlightContent: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  highlightDesc: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
  },
  contactText: {
    fontSize: 14,
    color: "#475569",
    marginLeft: 12,
  },
  socialSection: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
    gap: 24,
  },
  socialIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  copyrightText: {
    fontSize: 12,
    color: "#94A3B8",
  },
});

export default AboutScreen;
