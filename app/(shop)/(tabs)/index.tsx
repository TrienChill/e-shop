import React from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// --- Types & Interfaces ---
interface Category {
  id: string;
  name: string;
  image: string;
}

interface Product {
  id: string;
  category: string;
  name: string;
  price: string;
  image: string;
  isNew?: boolean;
}

// --- Data Mocking (URLs from HTML source) ---
const HERO_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCeWBrILvGP3jf6iTmVsvweEvK6S3iyTxCc8u8Unu9JgXuEbB15FVa2wTdy5fWb-DRbumplRCyW5lAAhYiBjnHyZDHPZhyqvAduHQFWWegDsdpB6DDWetLyAAknGlwfQ1DeDFO6yefK3udUjD17Gtm0G1Z-BvSA4hsmYkpRvvlYYGPnoTWNpJzrqUQ3duxo3PvPNoAsvHXvKaP_UBjKJ5EE4qRYF7sx0x5Dpjdwq0vYWqOaZMb2hYUzm-LYUam_300Cm3GYkUkbGqM';

const CATEGORIES: Category[] = [
  { id: '1', name: 'Just In', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4SX-C5ugHUpcbZRuQSZckLTEIlmipO_Ytrpya-8NjXkB5lSB6s9tWHYqFFP2n2E9WHqwSdeMKnrbb6jc0AWfvAr4bHLALogqGYI34nw47s3d3QLbSzJk3Kjbc8ziWjDJ3ZeNeP4u9_ajRVX-ETZVMU_6vsgFS_cb_D7REkh1Yoba5DuTTjPDn1at3qGnTE_EPPQqE7Oav2ANEDpLKMsEyRdz4yBTlE1W4Lspxp7eFPXqEUPwtZAp9UwszSu4Ox4LjIKE5YmTiDng' },
  { id: '2', name: 'Men', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsJxTHDYdYQ1Y0lU1vnTyOsArooXLMqyxBGkuBKr-YqJdprmosaGsBe1fD1oupDn8HcJEouFNKQdTyfPrzXDOlXDcc33yGfbaUf0y65XJrcNKgY7IBhppEc5g7nx76qn42DLnoHslIHKMl0jctesSaLmYhBnlDjW4T3nIl_kHysnfLeLxoH9QsQYkLUihzemwBqmIcLMoznwf5OJkU9JwwzZyWvjY1ljX_cno0d-I_O-e0NImhXwKGkcWC44njht-XubSIJEaAVuI' },
  { id: '3', name: 'Women', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAE6CaiuTCmg8QxI56-EMLQ0e3s3hADg-vxEvsDc2Jzfk5sCTt2MPqOxAtJXy95AKO0IYQaFzvc91LNLpqAcwJfDOtsne8F3WYN5ksumnesj0vwDHMcejG6cGtYeo_xe5NmSAFNzLAJSvFKMlOup2jmE5Jz6VHs4ylH_p9wXL-pTKk_YCbsNaBVTpODL3hjvTmmq_KSuCdeobRyDqjTiaSG1BGzk5grFOjXYoQQ1Gknoqp8liY-GXeX85MeEa8RXsSLPub6ssni1y0' },
  { id: '4', name: 'Accessories', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDIoW9kQCS6E9fQyKOlgYinHvVDefHbnfhTelObEKoJ1EFWZpRtoDzxTn12upRuFJAF22DtTr3vouOGL4X5CZ30khmP0TNlOaHMfJrM9MaRLBVDmN7fIwKVnmpJdf5Xdf5JJMlfnA0OkG227EKOwaByorJDNr9bfdG1zRImHPYpAgorENUcYdAs8YDBJDV04NTAYognIFyFys4PCTDEV2q9Xea9H6COmUB8BuHwduDlXzG_xzUnDfL7wDdsrjQqtFupcazwE85Pulg' },
  { id: '5', name: 'Shoes', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOIwMA2betjms5mknKBb7u2kkCWnmXDfa1F6NWpd4R18vcRMaFz2W1HUkmlJXzWv5jtdB3u7ga5cbFrKkLyzuytu79lhRfcWuNBhMgB2baITC_oKctS9mZsOlR4nXq5AznD3TpYext203VtuXGSD-R1fRTrqSN7MtjNcDgKgUUALS-ToCOkruGuQzERSoeUADuHA7AZurf8t8hjDNdyPreNTyb0j8Lo-PhyH0XJ_AnGlQeEuQ9-SDs7Mx6dhlRccioS612D6POmvw' },
];

const PRODUCTS_COL_1: Product[] = [
  {
    id: 'p1',
    category: 'Essential',
    name: 'Oversized Hoodie',
    price: '$120',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXVMfTsdi1TeMob0b2JwrL5p0H8yw6f5nxdn9-SuLAtkWdpsGsgaqDNN6LMD2GvCPSu71DfaBmq_iE1onLSHCDQJuchPU1z3nOPAgWZYlx6erO2fQaGhWAMSgs7NNnB4QpdvOjZAI3LNz0Wlu6Nys127DXY8-U0Kx0uaPYXYDFfZp3wNhy9c0e4Fuboh0e0O7lhzP8DUs2lI7ryluib_uG0_cx2Ps3s3XrazHC_Sf1P5duXHpabRQrDC-W9Y5pTCVItB2ssqWD64c',
  },
  {
    id: 'p2',
    category: 'Accessories',
    name: 'Leather Mini Bag',
    price: '$350',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7MGzMMwUkjvExK7hixjTcHvM0iBt-AcNr4bS48hHqGjPDukDblBm9PxlcCTKCNOCyNy8dt4psBEighlP4Om9_HLeSSeVEO7Uu2Q1KOM0GztiItdnsG0G5ZEwoxqyIb4yBHkCom9dQVhYH0iZ_8n2UUDduvLNAB4nSlplM1TKRTbn3qYFabRKvlpif2ti3aOTqdTvf_DyM2U4K3gFTTpGM1PxZECs5kzVsa_RTPtaWBcJxqwwkpiLnsJ95pYUXAPQcGJeBUqntVVs',
  },
];

const PRODUCTS_COL_2: Product[] = [
  {
    id: 'p3',
    category: 'Studio',
    name: 'Wide Leg Trousers',
    price: '$180',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMUIQ100EQoAycdRIEB76hD-BBVHq1chuGhonoNWpDlaAZ9MkRNtdJOboaqqkgxeqY7IUczIFlnQYjHkzHq4RNbyJut_WJT22Zufz_9kkHFUb20goyuKbkraoyAFwgofT-U3bPVrdzbyLppwpEfill1wu3aTL7MGKJ62IDsRQW9uXtpAhHtelXZHie0ppC-U0wsgXHcV6k1qXg03D47PD0Us1xmsckIozpHLEEbrcb4EMRb8E8_uAJvwm8KqAvvBhcQBJBTxtvffk',
    isNew: true,
  },
  {
    id: 'p4',
    category: 'Footwear',
    name: 'Runner Sneakers',
    price: '$210',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYBhSrbfeoM7E3NXKH8KuKYJrSnGM4YMKBEcrNgBfBbzHi8W1r_9ItCDqWbs3ySNtJjfqDi352629LAos4EfTBqgYv6hFtgQ-P1EBUqjF8eTjVU7ZMa-SueBZqtOaNHyz5uu0dhJXykwQav0w3yJtKfq3dpmBWWqFB0IKqZj70EU16a-mhTAr3EVrot1wVdkjg2tUNDSMepuMYFlZigCwV-XUxCtN_v_oLS2g4VmKlmtj4OOXZtadklVHoS9BvR1nE-0s7I3xmCd8',
  },
];


// --- Components ---

interface ProductCardProps {
  item: Product;
  heightRatio?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ item, heightRatio = 1.3 }) => (
  <View style={styles.productCard}>
    <View style={[styles.productImageContainer, { aspectRatio: 1 / heightRatio }]}>
      <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
      {item.isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )}
      <TouchableOpacity style={styles.favoriteButton}>
        <MaterialIcons name="favorite-border" size={18} color="#1a1a1a" />
      </TouchableOpacity>
    </View>
    <View style={styles.productInfo}>
      <Text style={styles.productCategory}>{item.category}</Text>
      <Text style={styles.productName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.productPrice}>{item.price}</Text>
    </View>
  </View>
);

const App = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="menu" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LUXE</Text>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="shopping-bag" size={28} color="#1a1a1a" />
          <View style={styles.cartBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <ImageBackground
            source={{ uri: HERO_IMAGE }}
            style={styles.heroImage}
            imageStyle={{ borderRadius: 20 }}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Text style={styles.heroSubtitle}>SUMMER DROP 24</Text>
              <Text style={styles.heroTitle}>New{'\n'}Collection</Text>
              <TouchableOpacity style={styles.shopNowButton}>
                <Text style={styles.shopNowText}>SHOP NOW</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>

        {/* Categories Carousel */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.categoryItem}>
                <View style={styles.categoryImageContainer}>
                  <Image source={{ uri: item.image }} style={styles.categoryImage} />
                </View>
                <Text style={styles.categoryName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Recommended Grid */}
        <View style={styles.recommendedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.masonryContainer}>
            {/* Column 1 */}
            <View style={styles.column}>
              {PRODUCTS_COL_1.map((item, index) => (
                <ProductCard key={item.id} item={item} heightRatio={index === 0 ? 1.33 : 1} />
              ))}
            </View>
            {/* Column 2 (Staggered top margin) */}
            <View style={[styles.column, styles.columnStaggered]}>
              {PRODUCTS_COL_2.map((item, index) => (
                <ProductCard key={item.id} item={item} heightRatio={index === 0 ? 1.33 : 1.25} />
              ))}
            </View>
          </View>
        </View>

        {/* Newsletter */}
        <View style={styles.newsletterSection}>
          <View style={styles.newsletterCard}>
            <View style={styles.mailIconContainer}>
              <MaterialIcons name="mail-outline" size={24} color="#1a1a1a" />
            </View>
            <Text style={styles.newsletterTitle}>Join the Club</Text>
            <Text style={styles.newsletterSubtitle}>Get 10% off your first order.</Text>
            
            <View style={styles.inputRow}>
              <TextInput 
                placeholder="Email address" 
                placeholderTextColor="#9ca3af"
                style={styles.emailInput}
              />
              <TouchableOpacity style={styles.arrowButton}>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Padding for Bottom Nav */}
        <View style={{ height: 100 }} />
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 8,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  // --- Hero Section ---
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 24,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 0.8, // 4/5 ratio
    overflow: 'hidden',
    borderRadius: 20,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)', // Gradient simulation
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    padding: 24,
    width: '100%',
    alignItems: 'flex-start',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 40,
    marginBottom: 16,
  },
  shopNowButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  shopNowText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // --- Categories ---
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 20,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  categoryImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  // --- Recommended ---
  recommendedSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // Align baseline
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888888',
    textDecorationLine: 'underline',
  },
  masonryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    gap: 24, // Vertical gap between items
  },
  columnStaggered: {
    marginLeft: 16, // Horizontal gap
    marginTop: 32, // Stagger effect
  },
  // Product Card Styles
  productCard: {
    width: '100%',
  },
  productImageContainer: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    zIndex: 10,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  productInfo: {
    paddingHorizontal: 4,
  },
  productCategory: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },

  // --- Newsletter ---
  newsletterSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  newsletterCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  mailIconContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 50,
    marginBottom: 16,
  },
  newsletterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  newsletterSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  emailInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  arrowButton: {
    backgroundColor: '#1a1a1a',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },


});

export default App;