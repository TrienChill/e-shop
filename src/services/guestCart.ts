import AsyncStorage from "@react-native-async-storage/async-storage";

const GUEST_DEVICE_ID_KEY = "guest_device_id";
const GUEST_CART_KEY = "guest_cart";

export interface GuestCartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  originalPrice: number;
  hasDiscount: boolean;
  quantity: number;
  image: string;
  color: string;
  size: string;
  rawColor: string;
  rawSize: string;
}

async function generateUUID(): Promise<string> {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getGuestDeviceId(): Promise<string> {
  try {
    let deviceId = await AsyncStorage.getItem(GUEST_DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = await generateUUID();
      await AsyncStorage.setItem(GUEST_DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return await generateUUID();
  }
}

export async function getGuestCart(): Promise<GuestCartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GuestCartItem[];
  } catch {
    return [];
  }
}

export async function saveGuestCart(items: GuestCartItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Lỗi khi lưu guest cart:", error);
  }
}

export async function addToGuestCart(item: Omit<GuestCartItem, "id">): Promise<GuestCartItem[]> {
  const cart = await getGuestCart();
  const existingIndex = cart.findIndex(
    (c) =>
      c.product_id === item.product_id &&
      c.rawColor === item.rawColor &&
      c.rawSize === item.rawSize
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += item.quantity;
  } else {
    cart.push({ ...item, id: `guest_${Date.now()}_${Math.random().toString(36).slice(2)}` });
  }

  await saveGuestCart(cart);
  return cart;
}

export async function updateGuestCartQuantity(
  itemId: string,
  quantity: number
): Promise<GuestCartItem[]> {
  const cart = await getGuestCart();
  const index = cart.findIndex((c) => c.id === itemId);
  if (index < 0) return cart;

  if (quantity <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].quantity = quantity;
  }

  await saveGuestCart(cart);
  return cart;
}

export async function removeFromGuestCart(itemId: string): Promise<GuestCartItem[]> {
  const cart = await getGuestCart();
  const filtered = cart.filter((c) => c.id !== itemId);
  await saveGuestCart(filtered);
  return filtered;
}

export async function clearGuestCart(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GUEST_CART_KEY);
  } catch (error) {
    console.error("Lỗi khi xóa guest cart:", error);
  }
}

/**
 * Merge giỏ hàng guest (AsyncStorage) vào DB (cart_items) sau khi đăng nhập.
 * - Nếu cùng product_id + color + size đã có trong DB → cộng dồn quantity
 * - Nếu chưa có → insert mới
 * - Sau khi merge xong → xóa guest cart khỏi AsyncStorage
 */
export async function mergeGuestCartToDb(
  supabase: any,
  userId: string
): Promise<{ merged: number; skipped: number }> {
  const guestItems = await getGuestCart();
  if (guestItems.length === 0) {
    return { merged: 0, skipped: 0 };
  }

  console.log(`[CartMerge] Merging ${guestItems.length} guest items for user ${userId}`);

  let merged = 0;
  let skipped = 0;

  for (const item of guestItems) {
    try {
      // Kiểm tra xem sản phẩm với cùng variant đã có trong DB chưa
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", Number(item.product_id))
        .eq("color", item.rawColor || "")
        .eq("size", item.rawSize || "")
        .maybeSingle();

      if (existing) {
        // Cộng dồn quantity
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + item.quantity })
          .eq("id", existing.id);

        if (error) {
          console.warn(`[CartMerge] Update failed for product ${item.product_id}:`, error.message);
          skipped++;
        } else {
          merged++;
        }
      } else {
        // Insert mới
        const { error } = await supabase
          .from("cart_items")
          .insert({
            user_id: userId,
            product_id: Number(item.product_id),
            quantity: item.quantity,
            color: item.rawColor || null,
            size: item.rawSize || null,
            is_selected: true,
          });

        if (error) {
          console.warn(`[CartMerge] Insert failed for product ${item.product_id}:`, error.message);
          skipped++;
        } else {
          merged++;
        }
      }
    } catch (err) {
      console.warn(`[CartMerge] Error processing item ${item.product_id}:`, err);
      skipped++;
    }
  }

  // Xóa guest cart sau khi merge
  await clearGuestCart();
  console.log(`[CartMerge] Done: ${merged} merged, ${skipped} skipped`);

  return { merged, skipped };
}
