import { useRouter } from "expo-router";
import {
    ChevronLeft,
    PackageSearch,
    PencilLine,
    Star,
    StarHalf
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import ReviewModal from "@/src/components/modals/ReviewModal";
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    LayoutAnimation,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
    primary: "#0055FF",
    secondary: "#1A1A1A",
    textGray: "#6B7280",
    lightGray: "#F3F4F6",
    white: "#FFFFFF",
    star: "#FBBF24",
    border: "#E5E7EB",
};

interface ReviewData {
    id: string;
    productName: string;
    variant: string;
    image: string;
    date: string;
    rating?: number;
    comment?: string;
    reviewedImages?: string[];
}

export default function ReviewsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"pending" | "reviewed">("pending");
    const [isModalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ReviewData | null>(null);

    // Tab switching animation values
    const tabLinePosition = useRef(new Animated.Value(0)).current;

    // Mock data (Sẽ kết nối Supabase tại đây)
    const [pendingItems, setPendingItems] = useState<ReviewData[]>([
        {
            id: "1",
            productName: "Áo Blazer Classic Style",
            variant: "Màu: Đen, Size: L",
            image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400",
            date: "Đã mua: 20/03/2024",
        }
    ]);

    const [reviewedItems, setReviewedItems] = useState<ReviewData[]>([
        {
            id: "101",
            productName: "Váy Lụa Satin Cao Cấp",
            variant: "Màu: Hồng, Size: M",
            image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
            date: "Đã đánh giá: 25/03/2024",
            rating: 5,
            comment: "Vải rất đẹp, mặc lên cực sang chảnh. Shop giao hàng nhanh!",
            reviewedImages: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=100"]
        }
    ]);

    // Tab switching animation
    useEffect(() => {
        Animated.spring(tabLinePosition, {
            toValue: activeTab === "pending" ? 0 : SCREEN_WIDTH / 2,
            useNativeDriver: false,
        }).start();
    }, [activeTab]);

    const handleOpenReview = (item: ReviewData) => {
        setSelectedItem(item);
        setModalVisible(true);
    };

    const handleSubmitReview = (data: { rating: number; comment: string }) => {
        // Logic: 1. Lưu vào bảng 'reviews', 2. Cập nhật bảng 'order_items' is_reviewed = true
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        if (selectedItem) {
            if (activeTab === "pending") {
                setReviewedItems([
                    { ...selectedItem, ...data, date: "Vừa xong" },
                    ...reviewedItems
                ]);
                setPendingItems(pendingItems.filter(i => i.id !== selectedItem.id));
            }
        }

        setModalVisible(false);
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <PackageSearch size={64} color={COLORS.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>
                {activeTab === "pending" ? "Mọi thứ đã xong!" : "Chưa có kỷ niệm nào"}
            </Text>
            <Text style={styles.emptySubtitle}>
                {activeTab === "pending"
                    ? "Bạn đã hoàn thành đánh giá cho tất cả sản phẩm đã mua."
                    : "Những đánh giá của bạn sẽ xuất hiện tại đây sau khi bạn viết chúng."}
            </Text>
        </View>
    );

    const renderItem = ({ item }: { item: ReviewData }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <Image source={{ uri: item.image }} style={styles.productImage} />
                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
                    <Text style={styles.productVariant}>{item.variant}</Text>
                    <Text style={styles.dateText}>{item.date}</Text>

                    {activeTab === "reviewed" && (
                        <View style={styles.ratingRow}>
                            {[0, 1, 2, 3, 4].map((i) => {
                                const ratingValue = item.rating || 0;
                                const filled = ratingValue >= i + 1;
                                const half = !filled && ratingValue >= i + 0.5;

                                return (
                                    <View key={i} style={{ position: "relative" }}>
                                        <Star size={14} color={COLORS.border} fill="transparent" />
                                        <View style={{ position: "absolute", top: 0, left: 0 }}>
                                            {half ? (
                                                <StarHalf size={14} color={COLORS.star} fill={COLORS.star} />
                                            ) : filled ? (
                                                <Star size={14} color={COLORS.star} fill={COLORS.star} />
                                            ) : null}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>

            {activeTab === "reviewed" && item.comment && (
                <View style={styles.reviewContent}>
                    <Text style={styles.commentText}>{item.comment}</Text>
                    {item.reviewedImages && (
                        <ScrollView horizontal style={styles.imageGallery}>
                            {item.reviewedImages.map((img, idx) => (
                                <Image key={idx} source={{ uri: img }} style={styles.reviewImageThumb} />
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            <View style={styles.cardFooter}>
                <TouchableOpacity
                    style={[styles.actionButton, activeTab === "reviewed" && styles.editButton]}
                    onPress={() => activeTab === "pending" ? handleOpenReview(item) : handleOpenReview(item)}
                >
                    {activeTab === "pending" ? (
                        <>
                            <PencilLine size={18} color={COLORS.white} />
                            <Text style={styles.actionButtonText}>Viết đánh giá</Text>
                        </>
                    ) : (
                        <Text style={styles.editButtonText}>Chỉnh sửa đánh giá</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={28} color={COLORS.secondary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Đánh giá sản phẩm</Text>
                <View style={{ width: 28 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab("pending")}>
                    <Text style={[styles.tabText, activeTab === "pending" && styles.tabTextActive]}>
                        Chờ đánh giá
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab("reviewed")}>
                    <Text style={[styles.tabText, activeTab === "reviewed" && styles.tabTextActive]}>
                        Đã đánh giá
                    </Text>
                </TouchableOpacity>
                <Animated.View style={[styles.tabLine, { left: tabLinePosition }]} />
            </View>

            {/* Content */}
            <FlatList
                data={activeTab === "pending" ? pendingItems : reviewedItems}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
            />

            {/* Review Bottom Sheet (Modal) */}
            <ReviewModal
                visible={isModalVisible}
                onClose={() => setModalVisible(false)}
                onSubmit={handleSubmitReview}
                product={selectedItem ? {
                    name: selectedItem.productName,
                    variant: selectedItem.variant,
                    image: selectedItem.image
                } : null}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        height: 60,
        backgroundColor: COLORS.white,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.secondary,
    },
    backBtn: { padding: 4 },
    tabBar: {
        flexDirection: "row",
        backgroundColor: COLORS.white,
        height: 50,
        position: "relative",
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    tabItem: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    tabText: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.textGray,
    },
    tabTextActive: {
        color: COLORS.primary,
    },
    tabLine: {
        position: "absolute",
        bottom: 0,
        width: "50%",
        height: 3,
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    listContainer: {
        padding: 20,
        flexGrow: 1,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
    },
    cardContent: {
        flexDirection: "row",
    },
    productImage: {
        width: 90,
        height: 90,
        borderRadius: 16,
        backgroundColor: COLORS.lightGray,
    },
    productInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: "center",
    },
    productName: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.secondary,
    },
    productVariant: {
        fontSize: 13,
        color: COLORS.textGray,
        marginTop: 4,
    },
    dateText: {
        fontSize: 12,
        color: COLORS.textGray,
        marginTop: 4,
    },
    ratingRow: {
        flexDirection: "row",
        marginTop: 8,
        gap: 4,
    },
    reviewContent: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
    },
    commentText: {
        fontSize: 14,
        color: COLORS.secondary,
        lineHeight: 20,
    },
    imageGallery: {
        marginTop: 12,
    },
    reviewImageThumb: {
        width: 60,
        height: 60,
        borderRadius: 12,
        marginRight: 8,
    },
    cardFooter: {
        marginTop: 16,
        alignItems: "flex-end",
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
    },
    actionButtonText: {
        color: COLORS.white,
        fontWeight: "bold",
        fontSize: 14,
    },
    editButton: {
        backgroundColor: "#F0F5FF",
    },
    editButtonText: {
        color: COLORS.primary,
        fontWeight: "600",
        fontSize: 13,
    },
    emptyContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
    },
    emptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#E6EFFF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.secondary,
    },
    emptySubtitle: {
        fontSize: 15,
        color: COLORS.textGray,
        textAlign: "center",
        marginTop: 10,
        paddingHorizontal: 40,
        lineHeight: 22,
    },
    // Modal Styles
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
    },
    modalIndicator: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 2,
        marginBottom: 16,
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
        marginVertical: 32,
        gap: 12,
    },
    bigStar: {
        shadowColor: COLORS.star,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
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
