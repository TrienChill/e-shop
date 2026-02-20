import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  Share2,
  ShoppingCart,
  Star,
  Tag,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.42;

// ─────────────────────────── Mock Data ───────────────────────────

const PRODUCT = {
  id: "1",
  name: "Elegant Summer Blouse",
  price: 17.0,
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ac mauris, adipiscing eu mauris id, pretium pulvinar sapien. Crafted from premium fabric for all-day comfort.",
  image:
    "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=600&q=80",
};

const VARIANTS: {
  id: string;
  color: string;
  size: string;
  image: string;
  label: string;
}[] = [
  {
    id: "v1",
    color: "PINK",
    size: "S",
    label: "Pink / S",
    image:
      "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=120&q=80",
  },
  {
    id: "v2",
    color: "RED",
    size: "M",
    label: "Red / M",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=120&q=80",
  },
  {
    id: "v3",
    color: "BEIGE",
    size: "L",
    label: "Beige / L",
    image:
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=120&q=80",
  },
  {
    id: "v4",
    color: "WHITE",
    size: "XL",
    label: "White / XL",
    image:
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=120&q=80",
  },
];

const REVIEWS = [
  {
    id: "r1",
    user: "Jessica Lee",
    avatar: "https://i.pravatar.cc/100?img=5",
    rating: 4,
    date: "2025-12-15",
    score: "4/5",
    comment:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vam nonummy nibh euismod tincidunt ut laoreet et dolore magna aliquyam erat.",
  },
  {
    id: "r2",
    user: "Anna Torres",
    avatar: "https://i.pravatar.cc/100?img=9",
    rating: 5,
    date: "2025-11-20",
    score: "5/5",
    comment:
      "Absolutely love this piece! The fabric quality is amazing and fits perfectly. Will definitely order again.",
  },
];

const POPULAR_PRODUCTS = [
  {
    id: "p1",
    name: "Floral Wrap Dress",
    price: 17.0,
    badge: "New",
    badgeColor: "#22C55E",
    image:
      "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=300&q=80",
  },
  {
    id: "p2",
    name: "Pink Mini Skirt",
    price: 17.0,
    badge: "Sale",
    badgeColor: "#3B82F6",
    image:
      "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=300&q=80",
  },
  {
    id: "p3",
    name: "Red Party Dress",
    price: 17.0,
    badge: "Hot",
    badgeColor: "#EF4444",
    image:
      "https://images.unsplash.com/photo-1566206091558-7f218b696731?w=300&q=80",
  },
  {
    id: "p4",
    name: "Casual Linen Set",
    price: 17.0,
    badge: "New",
    badgeColor: "#22C55E",
    image:
      "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=300&q=80",
  },
];

// ──────────────────────── Sub-components ─────────────────────────

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color={i <= rating ? "#FBBF24" : "#D1D5DB"}
          fill={i <= rating ? "#FBBF24" : "transparent"}
        />
      ))}
    </View>
  );
}

function ReviewCard({ review }: { review: (typeof REVIEWS)[0] }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Image source={{ uri: review.avatar }} style={styles.avatar} />
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewerName}>{review.user}</Text>
          <StarRow rating={review.rating} />
        </View>
        <View style={styles.reviewScore}>
          <Text style={styles.reviewDate}>{review.date}</Text>
          <Text style={styles.scoreText}>{review.score}</Text>
        </View>
      </View>
      <Text style={styles.reviewComment}>{review.comment}</Text>
    </View>
  );
}

function PopularCard({ item }: { item: (typeof POPULAR_PRODUCTS)[0] }) {
  const [liked, setLiked] = useState(false);
  return (
    <View style={styles.popularCard}>
      <View style={styles.popularImageWrapper}>
        <Image source={{ uri: item.image }} style={styles.popularImage} />
        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
        {/* Heart */}
        <TouchableOpacity
          style={styles.heartBtn}
          activeOpacity={0.7}
          onPress={() => setLiked((p) => !p)}
        >
          <Heart
            size={14}
            color={liked ? "#EF4444" : "#6B7280"}
            fill={liked ? "#EF4444" : "transparent"}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.popularPrice}>${item.price.toFixed(2)}</Text>
      <Text style={styles.popularName} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );
}

// ──────────────────────── Main Screen ────────────────────────────

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [selectedVariant, setSelectedVariant] = useState(VARIANTS[0]);
  const [wishlist, setWishlist] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Floating back button ── */}
      <TouchableOpacity
        style={styles.backBtn}
        activeOpacity={0.8}
        onPress={() => router.back()}
      >
        <ArrowLeft size={20} color="#111" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════ 1. Hero Image ══════════════ */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: PRODUCT.image }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Gradient overlay at bottom for style */}
          <View style={styles.heroGradient} />
        </View>

        {/* ══════════════ 2. Product Info ══════════════ */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${PRODUCT.price.toFixed(2)}</Text>
            <TouchableOpacity style={styles.shareBtn} activeOpacity={0.7}>
              <Share2 size={16} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          <Text style={styles.productName}>{PRODUCT.name}</Text>
          <Text style={styles.productDescription}>{PRODUCT.description}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* ══════════════ 3. Variations ══════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Variations</Text>
            <View style={styles.variantInfo}>
              <Text style={styles.variantInfoText}>
                {selectedVariant.color}
              </Text>
              <Text style={styles.variantInfoSep}> · </Text>
              <Text style={styles.variantInfoText}>{selectedVariant.size}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.variantList}
          >
            {VARIANTS.map((v) => {
              const selected = v.id === selectedVariant.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedVariant(v)}
                  style={[
                    styles.variantThumb,
                    selected && styles.variantThumbSelected,
                  ]}
                >
                  <Image
                    source={{ uri: v.image }}
                    style={styles.variantImage}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* ══════════════ 4. Specifications ══════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifications</Text>

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Material</Text>
            <View style={styles.specChips}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Cotton 95%</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>Nylon 5%</Text>
              </View>
            </View>
          </View>

          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Origin</Text>
            <View style={styles.specChips}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>EU</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.specRowLink} activeOpacity={0.7}>
            <Text style={styles.specLabel}>Size guide</Text>
            <ChevronRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* ══════════════ 5. Delivery ══════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery</Text>

          {[
            { type: "Standard", time: "5-7 days", price: "$3.00" },
            { type: "Express", time: "1-2 days", price: "$12.00" },
          ].map((d) => (
            <View key={d.type} style={styles.deliveryRow}>
              <Text style={styles.deliveryType}>{d.type}</Text>
              <View style={styles.deliveryMeta}>
                <View style={styles.deliveryTimeBadge}>
                  <Text style={styles.deliveryTimeText}>{d.time}</Text>
                </View>
                <Text style={styles.deliveryPrice}>{d.price}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* ══════════════ 6. Rating & Reviews ══════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rating &amp; Reviews</Text>

          {/* Overall stars */}
          <View style={styles.overallRating}>
            <StarRow rating={4} size={20} />
            <Text style={styles.overallScore}>4/5</Text>
          </View>

          {/* Individual reviews */}
          {REVIEWS.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}

          {/* View All */}
          <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.8}>
            <Text style={styles.viewAllText}>View All Reviews</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* ══════════════ 7. Most Popular ══════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Popular</Text>
            <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
              <Text style={styles.seeAllText}>See All</Text>
              <ChevronRight size={14} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          <View style={styles.popularGrid}>
            {POPULAR_PRODUCTS.map((item) => (
              <PopularCard key={item.id} item={item} />
            ))}
          </View>
        </View>

        {/* Bottom spacer so content isn't hidden behind action bar */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ══════════════ 8. Bottom Action Bar (Sticky) ══════════════ */}
      <View style={styles.actionBar}>
        {/* Left icons */}
        <View style={styles.actionIcons}>
          <TouchableOpacity
            style={styles.actionIcon}
            activeOpacity={0.7}
            onPress={() => setWishlist((p) => !p)}
          >
            <Heart
              size={22}
              color={wishlist ? "#EF4444" : "#fff"}
              fill={wishlist ? "#EF4444" : "transparent"}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionIcon} activeOpacity={0.7}>
            <ShoppingCart size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.discountBadge} activeOpacity={0.7}>
            <Tag size={14} color="#FBBF24" />
            <Text style={styles.discountText}>10% OFF</Text>
          </TouchableOpacity>
        </View>

        {/* Add to Bag CTA */}
        <TouchableOpacity style={styles.addBagBtn} activeOpacity={0.85}>
          <Text style={styles.addBagText}>Add To Bag</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ──────────────────────── Styles ─────────────────────────────────

const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Back button (floating)
  backBtn: {
    position: "absolute",
    top: 14,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },

  // ── Hero ──
  heroContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: "#F3F4F6",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(255,255,255,0.0)",
  },

  // ── Sections ──
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  // ── Price Row ──
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  price: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.3,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  productName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },

  // ── Variants ──
  variantInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  variantInfoText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  variantInfoSep: {
    fontSize: 12,
    color: "#93C5FD",
  },
  variantList: {
    paddingVertical: 4,
    gap: 10,
  },
  variantThumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  variantThumbSelected: {
    borderColor: "#3B82F6",
  },
  variantImage: {
    width: "100%",
    height: "100%",
  },

  // ── Specifications ──
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  specRowLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  specLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    minWidth: 70,
  },
  specChips: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },

  // ── Delivery ──
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  deliveryType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  deliveryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deliveryTimeBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  deliveryTimeText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  deliveryPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    minWidth: 46,
    textAlign: "right",
  },

  // ── Reviews ──
  overallRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  overallScore: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  reviewMeta: {
    flex: 1,
    gap: 4,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  reviewScore: {
    alignItems: "flex-end",
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FBBF24",
  },
  reviewComment: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },
  viewAllBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  viewAllText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Popular Grid ──
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "600",
  },
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  popularCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  popularImageWrapper: {
    position: "relative",
    width: "100%",
    height: CARD_WIDTH * 1.1,
  },
  popularImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  heartBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  popularPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  popularName: {
    fontSize: 12,
    color: "#6B7280",
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginTop: 2,
  },

  // ── Bottom Action Bar ──
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 10,
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251,191,36,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  discountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FBBF24",
  },
  addBagBtn: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  addBagText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
