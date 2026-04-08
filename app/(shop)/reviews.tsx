import ReviewModal from "@/src/components/modals/ReviewModal";
import { supabase } from "@/src/lib/supabase";
import { COLOR_TRANSLATIONS, getProductImageByColor } from "@/src/services/product";
import { useFocusEffect, useRouter } from "expo-router";
import {
    ChevronLeft,
    PackageSearch,
    PencilLine,
    Star,
    StarHalf
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    LayoutAnimation,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

interface ReviewData {
    id: string;
    product_id?: number | string;
    order_id?: number | string;
    order_item_id?: number | string;
    review_id?: string;
    productName: string;
    variant: string;
    image: string;
    date: string;
    rating?: number;
    comment?: string;
    reviewedImages?: string[];
    isEditable?: boolean;
    is_edited?: boolean;
}

export default function ReviewsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"pending" | "reviewed">("pending");
    const [isModalVisible, setModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ReviewData | null>(null);
    const [loading, setLoading] = useState(true);

    // Tab switching animation values
    const tabLinePosition = useRef(new Animated.Value(0)).current;

    const [pendingItems, setPendingItems] = useState<ReviewData[]>([]);
    const [reviewedItems, setReviewedItems] = useState<ReviewData[]>([]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Lấy danh sách đánh giá của user
            const { data: userReviews } = await supabase
                .from("reviews")
                .select("*")
                .eq("user_id", user.id);

            const reviewsMap = new Map();
            if (userReviews) {
                userReviews.forEach(r => reviewsMap.set(r.order_item_id || r.product_id, r));
            }

            // Lấy danh sách đơn hàng đã hoàn thành (completed)
            const { data: orders } = await supabase
                .from("orders")
                .select(`
                    id, 
                    created_at,
                    time_finished,
                    order_items (
                        id,
                        order_id,
                        is_reviewed,
                        product_id,
                        selected_variant,
                        products (
                            name,
                            images
                        )
                    )
                `)
                .eq("user_id", user.id)
                .in("status", ["completed"]);

            const pendingData: ReviewData[] = [];
            const reviewedData: ReviewData[] = [];

            if (orders) {
                orders.forEach((order: any) => {
                    const finishDateObj = new Date(order.time_finished || order.created_at);
                    const finishDate = finishDateObj.toLocaleDateString('vi-VN');
                    
                    const now = new Date();
                    const diffTime = now.getTime() - finishDateObj.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isEditable = diffDays <= 30;

                    if (order.order_items) {
                        order.order_items.forEach((item: any) => {
                            const isReviewed = item.is_reviewed; // Phân hạng chặt chẽ theo cột is_reviewed của order_items
                            const review = reviewsMap.get(item.id) || reviewsMap.get(item.product_id);

                            const colorName = COLOR_TRANSLATIONS[item.selected_variant?.color?.toLowerCase()] || item.selected_variant?.color;
                            const image = getProductImageByColor(item.products, item.selected_variant?.color) || "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400";

                            const reviewItem: ReviewData = {
                                id: item.id.toString(),
                                order_id: item.order_id,
                                product_id: item.product_id,
                                order_item_id: item.id,
                                productName: item.products?.name || "Sản phẩm",
                                variant: `Phân loại: ${colorName}, Size: ${item.selected_variant?.size}`,
                                image,
                                date: `Đã mua: ${finishDate}`,
                                isEditable,
                            };

                            if (isReviewed) {
                                if (review) {
                                    reviewItem.review_id = review.id;
                                    reviewItem.rating = review.rating;
                                    reviewItem.comment = review.comment;
                                    reviewItem.reviewedImages = review.images;
                                    reviewItem.is_edited = review.is_edited;
                                    reviewItem.date = `Đã đánh giá: ${new Date(review.created_at).toLocaleDateString('vi-VN')}`;
                                }
                                reviewedData.push(reviewItem);
                            } else {
                                pendingData.push({ ...reviewItem, createdAtMs: finishDateObj.getTime() } as any);
                            }
                        });
                    }
                });
            }

            setPendingItems(pendingData.sort((a: any, b: any) => b.createdAtMs - a.createdAtMs));
            setReviewedItems(reviewedData.reverse());
        } catch (err) {
            console.error("Lỗi lấy dữ liệu đánh giá:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

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

    const handleSubmitReview = async (data: { rating: number; comment: string; images: string[] }) => {
        if (!selectedItem) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            if (activeTab === "pending") {
                // Thêm mới review
                const { error: reviewError } = await supabase.from("reviews").upsert([{
                    user_id: user.id,
                    product_id: selectedItem.product_id,
                    order_id: selectedItem.order_id,
                    order_item_id: selectedItem.order_item_id,
                    rating: data.rating,
                    comment: data.comment,
                    images: data.images,
                    is_edited: false
                }], { onConflict: 'order_item_id' });
                if (reviewError) throw reviewError;

                // Cập nhật is_reviewed = true
                const { error: updateError } = await supabase
                    .from("order_items")
                    .update({ is_reviewed: true })
                    .eq("id", selectedItem.order_item_id);
                if (updateError) throw updateError;
            } else {
                // Chỉnh sửa review đã có
                if (selectedItem.review_id) {
                    const { error: updateReviewError } = await supabase
                        .from("reviews")
                        .update({ 
                            rating: data.rating, 
                            comment: data.comment,
                            images: data.images,
                            is_edited: true
                        })
                        .eq("id", selectedItem.review_id);
                    if (updateReviewError) throw updateReviewError;
                }
            }

            // Refresh data
            await fetchData();
            Alert.alert("Thành công", "Cảm ơn bạn đã đánh giá!");
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } catch (e: any) {
            console.error("Lỗi khi gửi đánh giá: ", e);
            alert("Đã xảy ra lỗi, vui lòng thử lại.");
        } finally {
            setModalVisible(false);
            setSelectedItem(null);
        }
    };

    const handleDeleteReview = async (item: ReviewData) => {
        Alert.alert(
            "Xác nhận xoá",
            "Bạn có chắc chắn muốn xoá đánh giá này?",
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xoá",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (!item.review_id) return;
                            const { error: deleteError } = await supabase
                                .from("reviews")
                                .delete()
                                .eq("id", item.review_id);
                            
                            if (deleteError) throw deleteError;

                            const { error: updateError } = await supabase
                                .from("order_items")
                                .update({ is_reviewed: false })
                                .eq("id", item.order_item_id);

                            if (updateError) throw updateError;
                            
                            fetchData();
                            Alert.alert("Thành công", "Đã xoá đánh giá.");
                        } catch (err: any) {
                            Alert.alert("Lỗi", "Không thể xoá: " + err.message);
                        }
                    }
                }
            ]
        );
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
            <TouchableOpacity 
                style={styles.cardContent} 
                activeOpacity={0.7}
                onPress={() => {
                    if (item.product_id) {
                        router.push(`/(shop)/product/${item.product_id}` as any);
                    }
                }}
            >
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
            </TouchableOpacity>

            {activeTab === "reviewed" && item.comment && (
                <View style={styles.reviewContent}>
                    <Text style={styles.commentText}>
                        {item.comment} {item.is_edited && <Text style={{ fontStyle: 'italic', fontSize: 12, color: COLORS.textGray }}>(Đã chỉnh sửa)</Text>}
                    </Text>
                    {item.reviewedImages && item.reviewedImages.length > 0 && (
                        <ScrollView horizontal style={styles.imageGallery} showsHorizontalScrollIndicator={false}>
                            {item.reviewedImages.map((img, idx) => (
                                <Image key={idx} source={{ uri: img }} style={styles.reviewImageThumb} />
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            <View style={styles.cardFooter}>
                {activeTab === "pending" ? (
                    <TouchableOpacity
                        style={[styles.actionButton, !item.isEditable && { backgroundColor: COLORS.border }]}
                        disabled={!item.isEditable}
                        onPress={() => handleOpenReview(item)}
                    >
                        <PencilLine size={18} color={item.isEditable ? COLORS.white : COLORS.textGray} />
                        <Text style={[styles.actionButtonText, !item.isEditable && { color: COLORS.textGray }]}>
                            {item.isEditable ? "Viết đánh giá" : "Đã quá 30 ngày"}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ flexDirection: "row", gap: 12 }}>
                        {item.isEditable && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.deleteButton]}
                                onPress={() => handleDeleteReview(item)}
                            >
                                <Text style={styles.deleteButtonText}>Xoá</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.actionButton, styles.editButton, !item.isEditable && { backgroundColor: COLORS.lightGray }]}
                            onPress={() => {
                                if (item.isEditable) {
                                    handleOpenReview(item);
                                } else {
                                    router.push({
                                        pathname: "/(shop)/product/reviews",
                                        params: {
                                            productId: item.product_id as string,
                                            productName: item.productName,
                                        },
                                    });
                                }
                            }}
                        >
                            <Text style={[styles.editButtonText, !item.isEditable && { color: COLORS.textGray }]}>
                                {item.isEditable ? "Chỉnh sửa" : "Xem đánh giá (Khoá)"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
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
            {loading ? (
                <View style={[styles.listContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={activeTab === "pending" ? pendingItems : reviewedItems}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={renderEmptyState}
                    showsVerticalScrollIndicator={false}
                />
            )}

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
                initialRating={selectedItem?.rating}
                initialComment={selectedItem?.comment}
                initialImages={selectedItem?.reviewedImages}
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
    deleteButton: {
        backgroundColor: "#FEF2F2",
    },
    deleteButtonText: {
        color: "#EF4444",
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
